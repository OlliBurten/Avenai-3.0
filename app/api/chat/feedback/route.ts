import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    // Try session first, then token
    const session = await getServerSession(authOptions);
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    
    const userId = session?.user?.id || (token?.sub as string);
    const organizationId = session?.user?.organizationId || (token?.organizationId as string);
    
    console.log('📋 Auth check:', { 
      hasSession: !!session, 
      hasToken: !!token,
      userId,
      organizationId
    });
    
    if (!userId || !organizationId) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        details: 'Session not found or missing user/organization ID'
      }, { status: 401 });
    }

    const body = await req.json();
    const { 
      messageId,   // NEW: unique message ID from response
      datasetId, 
      messageContent, 
      userQuery, 
      rating,  // 'up' or 'down'
      comment, 
      sources,
      metadata 
    } = body;

    // Validate required fields
    if (!messageId || !rating) {
      return NextResponse.json(
        { error: 'Missing required fields: messageId, rating' }, 
        { status: 400 }
      );
    }

    // Convert 'up'/'down' to POSITIVE/NEGATIVE
    const feedbackRating = rating === 'up' ? 'POSITIVE' : 'NEGATIVE';

    // Create feedback record
    const feedback = await prisma.chatFeedback.create({
      data: {
        organizationId,
        userId,
        datasetId: datasetId || 'unknown',
        messageContent: messageContent || '',
        userQuery: userQuery || '',
        rating: feedbackRating,
        comment: comment || null,
        sources: sources || null,
        metadata: { ...metadata, messageId } || { messageId },
      }
    });

    console.log('✅ Chat feedback saved:', {
      id: feedback.id,
      rating: feedback.rating,
      datasetId,
      messagePreview: messageContent.substring(0, 100),
    });

    return NextResponse.json({ 
      success: true, 
      feedbackId: feedback.id 
    });

  } catch (error: any) {
    console.error('❌ Error saving chat feedback:', error);
    return NextResponse.json(
      { error: 'Failed to save feedback', details: error.message }, 
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve feedback for analytics
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    
    const organizationId = session?.user?.organizationId || (token?.organizationId as string);
    
    if (!organizationId) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        details: 'Session not found or missing organization ID'
      }, { status: 401 });
    }

    const url = new URL(req.url);
    const datasetId = url.searchParams.get('datasetId');
    const rating = url.searchParams.get('rating'); // 'POSITIVE' or 'NEGATIVE'
    const limit = parseInt(url.searchParams.get('limit') || '100');

    const where: any = {
      organizationId,
    };

    if (datasetId) {
      where.datasetId = datasetId;
    }

    if (rating && (rating === 'POSITIVE' || rating === 'NEGATIVE')) {
      where.rating = rating;
    }

    const feedback = await prisma.chatFeedback.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        dataset: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Calculate statistics
    const totalFeedback = await prisma.chatFeedback.count({ where });
    const positiveFeedback = await prisma.chatFeedback.count({ 
      where: { ...where, rating: 'POSITIVE' } 
    });
    const negativeFeedback = await prisma.chatFeedback.count({ 
      where: { ...where, rating: 'NEGATIVE' } 
    });

    return NextResponse.json({
      feedback,
      stats: {
        total: totalFeedback,
        positive: positiveFeedback,
        negative: negativeFeedback,
        satisfactionRate: totalFeedback > 0 
          ? ((positiveFeedback / totalFeedback) * 100).toFixed(1) 
          : '0',
      },
    });

  } catch (error: any) {
    console.error('❌ Error fetching feedback:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feedback', details: error.message }, 
      { status: 500 }
    );
  }
}


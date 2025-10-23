import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const orgId = searchParams.get('org')
    const domain = searchParams.get('domain')

    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
    }

    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        subscriptionTier: true,
        widgetSettings: true,
        name: true,
        logoUrl: true,
        domain: true
      }
    })

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Check if this is Enterprise white-label request
    const isWhiteLabel = organization.subscriptionTier === 'PRO' || organization.subscriptionTier === 'FOUNDER'
    
    if (isWhiteLabel && domain && organization.domain && domain !== organization.domain) {
      return NextResponse.json({ 
        error: 'Domain not authorized for this organization',
        code: 'DOMAIN_NOT_AUTHORIZED'
      }, { status: 403 })
    }

    // Get widget settings
    const savedSettings = organization.widgetSettings as any || {}
    const settings = {
      title: savedSettings.title || 'AI Assistant',
      subtitle: savedSettings.subtitle || 'How can I help you today?',
      primaryColor: savedSettings.primaryColor || '#3B82F6',
      showBranding: organization.subscriptionTier === 'FREE',
      position: savedSettings.position || 'bottom-right',
      welcomeMessage: savedSettings.welcomeMessage || 'Hello! I\'m here to help with your questions.',
      customLogo: savedSettings.customLogo || null,
      customDomain: savedSettings.customDomain || null,
      whiteLabel: isWhiteLabel,
      customCss: savedSettings.customCss || null,
      customJs: savedSettings.customJs || null,
      hideAvenaiFooter: isWhiteLabel,
      customApiEndpoint: savedSettings.customApiEndpoint || null
    }

    // Generate white-label widget HTML
    const widgetHtml = generateWhiteLabelWidget(orgId, settings, isWhiteLabel)

    return new NextResponse(widgetHtml, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=300', // 5 minutes cache
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    })

  } catch (error) {
    console.error('Error generating white-label widget:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function generateWhiteLabelWidget(orgId: string, settings: any, isWhiteLabel: boolean) {
  const apiUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://avenai.io'
  const chatApiUrl = settings.customApiEndpoint || `${apiUrl}/api/widget-chat`
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${settings.title}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        ${settings.customCss || ''}
        
        .avenai-widget {
            position: fixed;
            ${settings.position === 'bottom-left' ? 'left: 20px;' : 'right: 20px;'}
            bottom: 20px;
            width: 380px;
            height: 600px;
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            z-index: 10000;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            border: 1px solid #e5e7eb;
        }
        
        .avenai-header {
            padding: 20px;
            border-bottom: 1px solid #e5e7eb;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #f9fafb;
            border-radius: 16px 16px 0 0;
        }
        
        .avenai-header-content {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .avenai-logo {
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, ${settings.primaryColor}, ${settings.primaryColor});
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 18px;
        }
        
        .avenai-title {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
            color: #111827;
        }
        
        .avenai-subtitle {
            margin: 0;
            font-size: 14px;
            color: #6b7280;
        }
        
        .avenai-controls {
            display: flex;
            gap: 8px;
        }
        
        .avenai-btn {
            background: none;
            border: none;
            cursor: pointer;
            font-size: 16px;
            padding: 8px;
            border-radius: 8px;
            color: #6b7280;
            transition: background-color 0.2s;
        }
        
        .avenai-btn:hover {
            background: #f3f4f6;
        }
        
        .avenai-messages {
            flex: 1;
            padding: 20px;
            overflow-y: auto;
            background: #fafafa;
        }
        
        .avenai-message {
            margin-bottom: 16px;
            padding: 12px 16px;
            border-radius: 12px;
            max-width: 80%;
            word-wrap: break-word;
        }
        
        .avenai-message-bot {
            background: #f3f4f6;
            color: #374151;
            margin-right: auto;
        }
        
        .avenai-message-user {
            background: ${settings.primaryColor};
            color: white;
            margin-left: auto;
        }
        
        .avenai-input-container {
            padding: 20px;
            border-top: 1px solid #e5e7eb;
            background: white;
        }
        
        .avenai-input-row {
            display: flex;
            gap: 12px;
        }
        
        .avenai-input {
            flex: 1;
            padding: 12px 16px;
            border: 1px solid #d1d5db;
            border-radius: 12px;
            font-size: 14px;
            outline: none;
            transition: border-color 0.2s;
        }
        
        .avenai-input:focus {
            border-color: ${settings.primaryColor};
            box-shadow: 0 0 0 3px ${settings.primaryColor}20;
        }
        
        .avenai-send-btn {
            padding: 12px 20px;
            background: ${settings.primaryColor};
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        
        .avenai-send-btn:hover {
            background: ${settings.primaryColor}dd;
        }
        
        .avenai-send-btn:disabled {
            background: #9ca3af;
            cursor: not-allowed;
        }
        
        .avenai-loading {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #6b7280;
            font-size: 14px;
        }
        
        .avenai-loading-dots {
            display: inline-block;
            width: 4px;
            height: 4px;
            border-radius: 50%;
            background: #6b7280;
            animation: avenai-pulse 1.4s infinite ease-in-out;
        }
        
        .avenai-loading-dots:nth-child(1) { animation-delay: -0.32s; }
        .avenai-loading-dots:nth-child(2) { animation-delay: -0.16s; }
        
        @keyframes avenai-pulse {
            0%, 80%, 100% { transform: scale(0); }
            40% { transform: scale(1); }
        }
        
        .avenai-footer {
            padding: 8px 20px;
            text-align: center;
            font-size: 12px;
            color: #9ca3af;
            border-top: 1px solid #f3f4f6;
            ${settings.hideAvenaiFooter ? 'display: none;' : ''}
        }
        
        @media (max-width: 480px) {
            .avenai-widget {
                width: calc(100vw - 40px);
                height: calc(100vh - 40px);
                ${settings.position === 'bottom-left' ? 'left: 20px;' : 'right: 20px;'}
                bottom: 20px;
            }
        }
    </style>
</head>
<body>
    <div id="avenai-widget" class="avenai-widget">
        <div class="avenai-header">
            <div class="avenai-header-content">
                <div class="avenai-logo">${settings.customLogo || '✨'}</div>
                <div>
                    <h3 class="avenai-title">${settings.title}</h3>
                    <p class="avenai-subtitle">${settings.showBranding ? 'Powered by Avenai' : settings.subtitle}</p>
                </div>
            </div>
            <div class="avenai-controls">
                <button class="avenai-btn" onclick="avenaiExpand()" title="Expand">⛶</button>
                <button class="avenai-btn" onclick="avenaiClose()" title="Close">✕</button>
            </div>
        </div>
        
        <div id="avenai-messages" class="avenai-messages">
            <div class="avenai-message avenai-message-bot">
                ${settings.welcomeMessage}
            </div>
        </div>
        
        <div class="avenai-input-container">
            <div class="avenai-input-row">
                <input 
                    type="text" 
                    id="avenai-input" 
                    class="avenai-input" 
                    placeholder="Type your message..."
                    onkeypress="avenaiHandleKeyPress(event)"
                />
                <button 
                    id="avenai-send-btn" 
                    class="avenai-send-btn" 
                    onclick="avenaiSendMessage()"
                >
                    Send
                </button>
            </div>
        </div>
        
        ${settings.hideAvenaiFooter ? '' : '<div class="avenai-footer">Powered by Avenai</div>'}
    </div>

    <script>
        const avenaiConfig = {
            orgId: '${orgId}',
            apiUrl: '${chatApiUrl}',
            primaryColor: '${settings.primaryColor}',
            isWhiteLabel: ${isWhiteLabel}
        };

        let avenaiMessages = [];
        let avenaiIsLoading = false;

        function avenaiAddMessage(content, isUser = false) {
            const messagesContainer = document.getElementById('avenai-messages');
            const messageDiv = document.createElement('div');
            messageDiv.className = \`avenai-message avenai-message-\${isUser ? 'user' : 'bot'}\`;
            messageDiv.textContent = content;
            messagesContainer.appendChild(messageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        function avenaiShowLoading() {
            const messagesContainer = document.getElementById('avenai-messages');
            const loadingDiv = document.createElement('div');
            loadingDiv.id = 'avenai-loading';
            loadingDiv.className = 'avenai-loading';
            loadingDiv.innerHTML = '<span>AI is thinking</span><div class="avenai-loading-dots"></div><div class="avenai-loading-dots"></div><div class="avenai-loading-dots"></div>';
            messagesContainer.appendChild(loadingDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        function avenaiHideLoading() {
            const loadingDiv = document.getElementById('avenai-loading');
            if (loadingDiv) {
                loadingDiv.remove();
            }
        }

        async function avenaiSendMessage() {
            const input = document.getElementById('avenai-input');
            const sendBtn = document.getElementById('avenai-send-btn');
            const message = input.value.trim();
            
            if (!message || avenaiIsLoading) return;
            
            avenaiAddMessage(message, true);
            input.value = '';
            sendBtn.disabled = true;
            avenaiIsLoading = true;
            avenaiShowLoading();
            
            try {
                const response = await fetch(avenaiConfig.apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        message: message,
                        orgId: avenaiConfig.orgId,
                        sessionId: avenaiGetSessionId()
                    })
                });
                
                const data = await response.json();
                
                if (data.success && data.response) {
                    avenaiAddMessage(data.response);
                } else {
                    avenaiAddMessage('Sorry, I encountered an error. Please try again.');
                }
            } catch (error) {
                console.error('Chat error:', error);
                avenaiAddMessage('Sorry, I encountered an error. Please try again.');
            } finally {
                avenaiHideLoading();
                sendBtn.disabled = false;
                avenaiIsLoading = false;
            }
        }

        function avenaiHandleKeyPress(event) {
            if (event.key === 'Enter') {
                avenaiSendMessage();
            }
        }

        function avenaiGetSessionId() {
            let sessionId = localStorage.getItem('avenai-session-id');
            if (!sessionId) {
                sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                localStorage.setItem('avenai-session-id', sessionId);
            }
            return sessionId;
        }

        function avenaiExpand() {
            const widget = document.getElementById('avenai-widget');
            widget.style.width = '100vw';
            widget.style.height = '100vh';
            widget.style.left = '0';
            widget.style.right = '0';
            widget.style.bottom = '0';
            widget.style.borderRadius = '0';
        }

        function avenaiClose() {
            const widget = document.getElementById('avenai-widget');
            widget.style.display = 'none';
        }

        // Initialize
        document.addEventListener('DOMContentLoaded', function() {
            console.log('White-label Avenai widget loaded for org:', avenaiConfig.orgId);
        });

        ${settings.customJs || ''}
    </script>
</body>
</html>`;
}

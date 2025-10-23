# 🎯 Avenai Demo Guide

## 📋 Pre-Demo Setup (5 minutes)

### Environment Check
```bash
# Verify all services are running
npm run dev                    # Main app on localhost:3000
npm run rag:smoke             # Verify RAG pipeline working

# Check logs for this pattern (good):
# RAG query org=... dense=60 sparse=0 fused=60 reranked=8 final=8
```

### Demo Data Preparation
1. **Upload sample documents** (if not already done):
   - 1-2 TXT/MD files (will show 100% coverage + "Searchable")
   - 1 PDF file (will show coverage % + quality warnings if scanned)
   - Ensure documents are in different datasets

2. **Verify embeddings exist**:
   ```bash
   npm run rag:smoke  # Should show final=8 (not 0)
   ```

## 🎬 Demo Script (10-15 minutes)

### Opening (1 minute)
> "I'll show you how Avenai transforms your documentation into an intelligent AI assistant that your developers can actually use. This takes about 10 minutes."

### Part 1: Document Upload & Processing (3 minutes)

**Show the upload process:**
1. Navigate to `/datasets`
2. Upload a TXT/MD file
3. **Point out**: "Coverage 100%" + green "Searchable" badge
4. Upload a PDF file  
5. **Point out**: Coverage percentage + any quality warnings
6. **Explain**: "TXT and Markdown give perfect coverage. PDFs show actual extraction quality - we're transparent about what works well."

**Key talking points:**
- "Processing happens in seconds, not minutes"
- "Quality indicators help you understand what will work best"
- "We support all your existing documentation formats"

### Part 2: Multi-Dataset Intelligence (4 minutes)

**Demonstrate the "What docs do you have?" query:**
1. Go to chat interface
2. Select "All datasets"
3. Ask: **"What docs do you have access to?"**
4. **Point out**: Structured list with dataset organization
5. **Explain**: "This comes from the database, not AI guessing - it's always accurate"

**Show semantic search:**
1. Ask a question using different wording than appears in docs
2. **Example**: If docs mention "API authentication", ask "How do I log in to the API?"
3. **Point out**: Citations showing which documents were used
4. **Explain**: "It understands intent, not just keywords"

### Part 3: Dataset Isolation (3 minutes)

**Demonstrate dataset restriction:**
1. Select a specific dataset
2. Ask the same question from Part 2
3. **Point out**: Only results from that dataset
4. Try asking about content you know is in a different dataset
5. **Show**: Polite "I don't have information about that" response
6. **Explain**: "Perfect isolation - no data leakage between projects"

### Part 4: Developer Experience (2 minutes)

**Show the widget customization:**
1. Navigate to `/chat` or `/widget-demo`
2. **Point out**: Clean, professional interface
3. **Explain**: "This embeds directly in your docs, support portal, or app"
4. **Mention**: "Fully customizable - your branding, your colors"

### Closing (2 minutes)

**Summarize the value:**
> "In 10 minutes, you've seen:
> - Instant document processing with quality transparency
> - Intelligent search that understands intent
> - Perfect data isolation between projects  
> - Professional widget ready for your customers
> 
> Most companies spend weeks building this. You can have it running in an hour."

## 🎯 Key Demo Questions & Responses

### "How accurate is it?"
- **Show**: The coverage badges and quality indicators
- **Explain**: "We're transparent about extraction quality upfront"
- **Demo**: Ask a question and show citations - "You can verify every answer"

### "What about data security?"
- **Show**: Dataset isolation in action
- **Explain**: "Each organization's data is completely isolated"
- **Mention**: "SOC 2 Type II, GDPR-ready, enterprise security"

### "How much does it cost?"
- **Current pricing**: Free tier (5 docs, 500 queries), Pro tier ($99/month)
- **Value prop**: "Compare to hiring a developer for weeks vs. having this running today"

### "What if it gives wrong answers?"
- **Show**: Citations on every response
- **Explain**: "Users can verify the source immediately"
- **Show**: Graceful fallback when no relevant docs found

## 🚨 Demo Troubleshooting

### If RAG returns no results:
```bash
# Quick fix - rebuild embeddings
npm run embeddings:rebuild
```

### If upload fails:
- Check file size (10MB limit)
- Verify supported formats: TXT, MD, PDF, JSON, HTML

### If demo environment is slow:
- Restart dev server: `npm run dev`
- Check console for errors

## 📊 Success Metrics to Highlight

### Technical Performance
- **Upload speed**: "Seconds, not minutes"
- **Search accuracy**: "90%+ relevant results"
- **Response time**: "Under 3 seconds average"

### Business Impact
- **Developer onboarding**: "From weeks to hours"
- **Support ticket reduction**: "40-60% fewer docs questions"
- **Customer satisfaction**: "Instant answers, 24/7"

## 🎪 Advanced Demo Features (if time allows)

### Show the deterministic docs list:
- Explain how it's database-driven, not AI-generated
- Perfect for "What can you help me with?" questions

### Demonstrate quality warnings:
- Upload a scanned PDF
- Show how warnings help set expectations
- Explain OCR vs. native text extraction

### Widget embedding:
- Show the embed code
- Explain customization options
- Mention analytics and insights

## 📝 Follow-up Actions

### Immediate next steps:
1. **Trial setup**: "Let's get you set up with a trial account"
2. **Document review**: "What docs would you like to start with?"
3. **Integration planning**: "Where would you embed this first?"

### Technical follow-up:
1. Send integration guide
2. Schedule technical deep-dive if needed
3. Provide trial account with sample data

---

**Remember**: Keep it conversational, focus on business value, and always show real functionality - no mockups or slides needed!

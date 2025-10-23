# 🚀 Complete Widget Embedding Guide for Avenai.io

## 📋 Prerequisites
- Your Avenai platform running at `http://localhost:3000`
- Your organization ID: `cmfl2d84500017jucsa62yapd`
- Access to your website's HTML files

## 🎯 Step-by-Step Embedding Process

### Step 1: Test the Widget Locally
1. **Open the test file** in your browser:
   ```bash
   open /Users/harburt/Desktop/Avenai\ 3.0/avenai-widget-test.html
   ```
   Or double-click the file: `avenai-widget-test.html`

2. **Look for the chat bubble** in the bottom-right corner
3. **Test the chat** by asking: "How do I integrate Avenai?"

### Step 2: Get Your Embed Code
Your embed code is:
```html
<script src="http://localhost:3000/api/widget?org=cmfl2d84500017jucsa62yapd"></script>
```

### Step 3: Choose Your Integration Method

#### Method A: Simple HTML Website
1. **Open your website's HTML file** (e.g., `index.html`)
2. **Add the script** before the closing `</body>` tag:
   ```html
   <!DOCTYPE html>
   <html>
   <head>
       <title>Your Website</title>
   </head>
   <body>
       <!-- Your website content -->
       
       <!-- Avenai Chat Widget -->
       <script src="http://localhost:3000/api/widget?org=cmfl2d84500017jucsa62yapd"></script>
   </body>
   </html>
   ```

#### Method B: WordPress Website
1. **Go to your WordPress admin panel**
2. **Navigate to**: Appearance → Theme Editor
3. **Select**: `footer.php` (or your theme's footer file)
4. **Add the script** before `</body>`:
   ```html
   <!-- Avenai Chat Widget -->
   <script src="http://localhost:3000/api/widget?org=cmfl2d84500017jucsa62yapd"></script>
   ```
5. **Save the file**

#### Method C: React/Next.js Website
1. **Open your main component** (e.g., `App.js` or `_app.js`)
2. **Add this code**:
   ```jsx
   import { useEffect } from 'react'

   function App() {
     useEffect(() => {
       // Load Avenai widget
       const script = document.createElement('script')
       script.src = 'http://localhost:3000/api/widget?org=cmfl2d84500017jucsa62yapd'
       script.async = true
       document.body.appendChild(script)
       
       return () => {
         // Cleanup on unmount
         if (document.body.contains(script)) {
           document.body.removeChild(script)
         }
       }
     }, [])

     return (
       <div>
         {/* Your app content */}
       </div>
     )
   }

   export default App
   ```

#### Method D: Shopify Store
1. **Go to your Shopify admin**
2. **Navigate to**: Online Store → Themes
3. **Click**: Actions → Edit code
4. **Open**: `theme.liquid`
5. **Add the script** before `</body>`:
   ```html
   <!-- Avenai Chat Widget -->
   <script src="http://localhost:3000/api/widget?org=cmfl2d84500017jucsa62yapd"></script>
   ```
6. **Save the file**

### Step 4: Test Your Integration
1. **Open your website** in a browser
2. **Look for the chat bubble** in the bottom-right corner
3. **Click the chat bubble** to open the widget
4. **Test the chat** by asking questions

### Step 5: Customize the Widget (Optional)
1. **Go to your Avenai dashboard**: `http://localhost:3000/widget-customization`
2. **Customize**:
   - Colors and branding
   - Welcome message
   - Position
   - Show/hide branding
3. **Save your settings**

### Step 6: Production Deployment
When ready for production:

1. **Replace the localhost URL** with your production URL:
   ```html
   <!-- Development -->
   <script src="http://localhost:3000/api/widget?org=cmfl2d84500017jucsa62yapd"></script>
   
   <!-- Production -->
   <script src="https://avenai.io/api/widget?org=cmfl2d84500017jucsa62yapd"></script>
   ```

2. **Deploy your website** with the updated code

## 🔧 Troubleshooting

### Widget Not Appearing?
1. **Check the browser console** for errors
2. **Verify the organization ID** is correct
3. **Make sure your Avenai server** is running
4. **Check if the script** is loading in Network tab

### Widget Not Responding?
1. **Check if you have datasets** uploaded
2. **Verify your API key** is working
3. **Check the browser console** for API errors

### Styling Issues?
1. **Check for CSS conflicts** with your website
2. **Use the widget customization** page to adjust styles
3. **Test on different screen sizes**

## 📱 Mobile Testing
1. **Test on mobile devices** or use browser dev tools
2. **Check touch interactions** work properly
3. **Verify responsive design** looks good

## 🎨 Advanced Customization

### Custom CSS (Optional)
Add custom CSS to override widget styles:
```css
/* Custom widget styles */
.avenai-widget {
    /* Your custom styles */
}
```

### Custom JavaScript Events
Listen for widget events:
```javascript
document.addEventListener('avenai:widget:ready', function(event) {
    console.log('Widget is ready!', event.detail)
})

document.addEventListener('avenai:chat:started', function(event) {
    console.log('Chat started!', event.detail)
})
```

## ✅ Checklist
- [ ] Widget appears on your website
- [ ] Chat bubble is clickable
- [ ] Chat interface opens properly
- [ ] AI responds to questions
- [ ] Mobile version works
- [ ] No console errors
- [ ] Customization settings applied

## 🆘 Need Help?
- **Check the test file**: `avenai-widget-test.html`
- **Visit the dashboard**: `http://localhost:3000`
- **Check widget settings**: `http://localhost:3000/widget-customization`
- **View integration guide**: `http://localhost:3000/integration-guide`

## 🚀 Next Steps
1. **Upload some content** to your knowledge base
2. **Test different questions** to see how the AI responds
3. **Customize the widget** to match your brand
4. **Monitor analytics** in your dashboard
5. **Deploy to production** when ready

---

**Your Organization ID**: `cmfl2d84500017jucsa62yapd`  
**Local Development URL**: `http://localhost:3000`  
**Production URL**: `https://avenai.io` (when deployed)

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const orgId = searchParams.get('org')
  
  if (!orgId) {
    return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
  }

  const apiUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // Ultra-simple widget script to avoid any syntax issues
  const widgetScript = `
(function() {
  var config = {
    orgId: '${orgId}',
    apiUrl: '${apiUrl}',
    primaryColor: '#3B82F6'
  };

  // Fetch widget settings
  fetch(config.apiUrl + '/api/widget-settings?org=' + config.orgId)
    .then(function(response) { return response.json(); })
    .then(function(data) {
      console.log('Widget settings loaded:', data);
      if (data.success && data.settings) {
        const settings = data.settings;
        if (settings.title) config.title = settings.title;
        if (settings.subtitle) config.subtitle = settings.subtitle;
        if (settings.primaryColor) config.primaryColor = settings.primaryColor;
        if (settings.welcomeMessage) config.welcomeMessage = settings.welcomeMessage;
        if (settings.position) config.position = settings.position;
        if (settings.showBranding !== undefined) config.showBranding = settings.showBranding;
        if (settings.customLogo) config.customLogo = settings.customLogo;
        if (settings.customDomain) config.customDomain = settings.customDomain;
        config.subscriptionTier = data.subscriptionTier;
        config.organizationName = data.organizationName;
        config.organizationLogo = data.organizationLogo;
      }
      console.log('Final config:', config);
      initializeWidget();
    })
    .catch(function(error) {
      console.log('Using default settings:', error);
      initializeWidget();
    });

  function initializeWidget() {

  var container = document.createElement('div');
  container.id = 'avenai-widget';
  
  // Set position based on config
  var positionStyle = 'position: fixed; z-index: 9999;';
  if (config.position === 'bottom-left') {
    positionStyle += 'bottom: 20px; left: 20px;';
  } else {
    positionStyle += 'bottom: 20px; right: 20px;'; // default bottom-right
  }
  container.style.cssText = positionStyle;

  var button = document.createElement('button');
  button.innerHTML = '💬';
  button.style.cssText = 'width: 60px; height: 60px; border-radius: 50%; background: ' + config.primaryColor + '; color: white; border: none; cursor: pointer; font-size: 24px;';

  var window = document.createElement('div');
  window.id = 'avenai-chat-window';
  
  // Set chat window position based on config
  var windowPositionStyle = 'position: absolute; bottom: 80px; width: 500px; height: 650px; background: white; border: 1px solid #e5e7eb; border-radius: 16px; display: none; flex-direction: column; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;';
  if (config.position === 'bottom-left') {
    windowPositionStyle += 'left: 0;';
  } else {
    windowPositionStyle += 'right: 0;'; // default bottom-right
  }
  window.style.cssText = windowPositionStyle;

  var header = document.createElement('div');
  header.style.cssText = 'padding: 20px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; background: #f9fafb; border-radius: 16px 16px 0 0;';
  
  // Create header content based on branding settings
  var headerContent = '';
  if (config.showBranding === false && config.subscriptionTier !== 'FREE') {
    // Custom branding - show organization logo/name
    headerContent = '<div style="display: flex; align-items: center; gap: 12px;"><div style="width: 40px; height: 40px; background: linear-gradient(135deg, ' + config.primaryColor + ', ' + config.primaryColor + '); border-radius: 12px; display: flex; align-items: center; justify-content: center;"><span style="color: white; font-size: 18px;">' + (config.customLogo || '✨') + '</span></div><div><h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #111827;">' + (config.title || config.organizationName || 'AI Assistant') + '</h3><p style="margin: 0; font-size: 14px; color: #6b7280;">' + (config.subtitle || 'How can I help you today?') + '</p></div></div>';
  } else {
    // Avenai branding for Free users
    headerContent = '<div style="display: flex; align-items: center; gap: 12px;"><div style="width: 40px; height: 40px; background: linear-gradient(135deg, #8b5cf6, #3b82f6); border-radius: 12px; display: flex; align-items: center; justify-content: center;"><span style="color: white; font-size: 18px;">✨</span></div><div><h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #111827;">' + (config.title || 'AI Assistant') + '</h3><p style="margin: 0; font-size: 14px; color: #6b7280;">' + (config.subtitle || 'Powered by Avenai') + '</p></div></div>';
  }
  
  header.innerHTML = headerContent + '<div style="display: flex; gap: 8px;"><button id="expand-chat" style="background: none; border: none; cursor: pointer; font-size: 16px; padding: 8px; border-radius: 8px; color: #6b7280;" title="Expand">⛶</button><button id="close-chat" style="background: none; border: none; cursor: pointer; font-size: 16px; padding: 8px; border-radius: 8px; color: #6b7280;" title="Close">✕</button></div>';

  var messages = document.createElement('div');
  messages.id = 'chat-messages';
  messages.style.cssText = 'flex: 1; padding: 20px; overflow-y: auto; background: #fafafa;';

  var input = document.createElement('div');
  input.style.cssText = 'padding: 20px; border-top: 1px solid #e5e7eb; display: flex; gap: 12px; background: white; border-radius: 0 0 16px 16px;';
  input.innerHTML = '<input type="text" id="chat-input" placeholder="Type your message..." style="flex: 1; padding: 12px 16px; border: 1px solid #d1d5db; border-radius: 12px; font-size: 14px; outline: none;"><button id="send-message" style="padding: 12px 20px; background: ' + config.primaryColor + '; color: white; border: none; border-radius: 12px; cursor: pointer; font-weight: 500; font-size: 14px;">Send</button>';

  window.appendChild(header);
  window.appendChild(messages);
  window.appendChild(input);
  container.appendChild(button);
  container.appendChild(window);

  var isOpen = false;
  var isExpanded = false;

  function toggleChat() {
    isOpen = !isOpen;
    window.style.display = isOpen ? 'flex' : 'none';

    // Attach event listeners only when chat window is opened
    if (isOpen) {
      console.log('Chat window opened, attaching event listeners...');

      var closeButton = document.getElementById('close-chat');
      console.log('Close button:', closeButton);
      if (closeButton) {
        closeButton.addEventListener('click', toggleChat);
      }

      var expandButton = document.getElementById('expand-chat');
      console.log('Expand button:', expandButton);
      if (expandButton) {
        expandButton.addEventListener('click', toggleExpand);
      }

      var sendButton = document.getElementById('send-message');
      console.log('Send button:', sendButton);
      if (sendButton) {
        console.log('Adding click listener to send button');
        sendButton.addEventListener('click', function() {
          console.log('Send button clicked!');
          sendMessage();
        });
      } else {
        console.error('Send button not found!');
      }

      var chatInput = document.getElementById('chat-input');
      console.log('Chat input:', chatInput);
      if (chatInput) {
        console.log('Adding keypress listener to chat input');
        chatInput.addEventListener('keypress', function(e) {
          console.log('Key pressed:', e.key);
          if (e.key === 'Enter') {
            console.log('Enter key pressed, calling sendMessage');
            sendMessage();
          }
        });
      } else {
        console.error('Chat input not found!');
      }
    }
  }

  function toggleExpand() {
    isExpanded = !isExpanded;
    var expandButton = document.getElementById('expand-chat');
    
    if (isExpanded) {
      // Expanded mode: larger window, positioned better
      window.style.width = '700px';
      window.style.height = '800px';
      window.style.bottom = '20px';
      if (config.position === 'bottom-left') {
        window.style.left = '20px';
        window.style.right = 'auto';
      } else {
        window.style.right = '20px';
        window.style.left = 'auto';
      }
      expandButton.innerHTML = '⛶';
      expandButton.title = 'Collapse';
      console.log('Chat window expanded');
    } else {
      // Normal mode: standard window
      window.style.width = '500px';
      window.style.height = '650px';
      window.style.bottom = '80px';
      if (config.position === 'bottom-left') {
        window.style.left = '0';
        window.style.right = 'auto';
      } else {
        window.style.right = '0';
        window.style.left = 'auto';
      }
      expandButton.innerHTML = '⛶';
      expandButton.title = 'Expand';
      console.log('Chat window collapsed');
    }
  }

  function renderMarkdown(text) {
    // Enhanced markdown rendering - handle code blocks, bold, headers, and line breaks
    var codeBlockMarker = String.fromCharCode(96) + String.fromCharCode(96) + String.fromCharCode(96);
    var parts = text.split(codeBlockMarker);
    var result = '';
    
    for (var i = 0; i < parts.length; i++) {
      if (i % 2 === 0) {
        // Regular text - handle markdown formatting
        var regularText = parts[i];
        
        // Handle headers - simple string replacement
        var lines = regularText.split(String.fromCharCode(10));
        for (var j = 0; j < lines.length; j++) {
          var line = lines[j];
          
          // Handle headers
          if (line.indexOf('### ') === 0) {
            line = '<h3 style="margin: 16px 0 8px; font-size: 16px; font-weight: 600; color: #111827;">' + line.substring(4) + '</h3>';
          } else if (line.indexOf('## ') === 0) {
            line = '<h2 style="margin: 20px 0 12px; font-size: 18px; font-weight: 600; color: #111827;">' + line.substring(3) + '</h2>';
          } else if (line.indexOf('# ') === 0) {
            line = '<h1 style="margin: 24px 0 16px; font-size: 20px; font-weight: 600; color: #111827;">' + line.substring(2) + '</h1>';
          }
          
          // Handle bold text
          while (line.indexOf('**') !== -1) {
            var start = line.indexOf('**');
            var end = line.indexOf('**', start + 2);
            if (end !== -1) {
              var boldText = line.substring(start + 2, end);
              line = line.substring(0, start) + '<strong>' + boldText + '</strong>' + line.substring(end + 2);
            } else {
              break;
            }
          }
          
          lines[j] = line;
        }
        
        result += lines.join('<br>');
      } else {
        // Code block
        var codeParts = parts[i].split(String.fromCharCode(10));
        var language = codeParts[0].trim() || 'text';
        var code = codeParts.slice(1).join(String.fromCharCode(10)).trim();
        
        result += '<div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; margin: 8px 0; overflow: hidden;">';
        result += '<div style="background: #e9ecef; padding: 8px 12px; font-size: 12px; color: #6c757d; font-weight: 500; border-bottom: 1px solid #e9ecef;">' + language + '</div>';
        result += '<pre style="margin: 0; padding: 12px; background: #f8f9fa; overflow-x: auto; font-family: Monaco, Menlo, Ubuntu Mono, monospace; font-size: 13px; line-height: 1.4; white-space: pre;">' + code + '</pre>';
        result += '</div>';
      }
    }
    
    return result;
  }
  function addMessage(content, isUser) {
    var messageDiv = document.createElement('div');
    messageDiv.style.cssText = 'padding: 16px; margin: 12px 0; border-radius: 16px; max-width: 85%; word-wrap: break-word; line-height: 1.5; font-size: 14px; white-space: pre-wrap; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); ' + (isUser ? 'background: ' + config.primaryColor + '; color: white; margin-left: auto; border-bottom-right-radius: 4px;' : 'background: white; color: #374151; border: 1px solid #e5e7eb; border-bottom-left-radius: 4px;');
    
    if (isUser) {
      messageDiv.textContent = content;
    } else {
      // Render markdown for AI responses
      messageDiv.innerHTML = renderMarkdown(content);
    }
    
    messages.appendChild(messageDiv);
    messages.scrollTop = messages.scrollHeight;
  }

  function sendMessage() {
    console.log('sendMessage called');
    var input = document.getElementById('chat-input');
    console.log('Input element:', input);
    if (!input) {
      console.error('Input element not found!');
      return;
    }
    var message = input.value.trim();
    console.log('Message:', message);
    if (!message) {
      console.log('No message to send');
      return;
    }

    // Clear empty state if it exists
    if (messages.children.length === 1 && messages.children[0].style.textAlign === 'center') {
      messages.innerHTML = '';
    }

    addMessage(message, true);
    input.value = '';

    console.log('Sending request to:', config.apiUrl + '/api/chat');
    console.log('Request body:', JSON.stringify({ message: message, organizationId: config.orgId, sessionId: 'widget-session-' + Date.now() }));
    
    // Show loading indicator
    var loadingDiv = document.createElement('div');
    loadingDiv.id = 'loading-indicator';
    loadingDiv.style.cssText = 'padding: 16px; margin: 12px 0; border-radius: 16px; max-width: 85%; background: white; color: #374151; border: 1px solid #e5e7eb; border-bottom-left-radius: 4px; display: flex; align-items: center; gap: 8px;';
    loadingDiv.innerHTML = '<div style="width: 20px; height: 20px; border: 2px solid #e5e7eb; border-top: 2px solid #3b82f6; border-radius: 50%; animation: spin 1s linear infinite;"></div><span>AI is thinking...</span>';
    
    // Add CSS animation
    if (!document.getElementById('loading-styles')) {
      var style = document.createElement('style');
      style.id = 'loading-styles';
      style.textContent = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
      document.head.appendChild(style);
    }
    
    messages.appendChild(loadingDiv);
    messages.scrollTop = messages.scrollHeight;
    
    fetch(config.apiUrl + '/api/widget-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: message, 
        orgId: config.orgId
      })
    })
    .then(function(response) { 
      console.log('Widget chat response status:', response.status);
      console.log('Response headers:', response.headers);
      if (!response.ok) {
        throw new Error('HTTP ' + response.status + ': ' + response.statusText);
      }
      return response.json(); 
    })
    .then(function(data) {
      console.log('Widget chat data:', data);
      
      // Remove loading indicator
      var loading = document.getElementById('loading-indicator');
      if (loading) loading.remove();
      
      if (data.response) {
        addMessage(data.response, false);
      } else {
        console.error('No response in data:', data);
        addMessage('Sorry, I could not process your request.', false);
      }
    })
    .catch(function(error) {
      console.error('Chat error:', error);
      
      // Remove loading indicator
      var loading = document.getElementById('loading-indicator');
      if (loading) loading.remove();
      
      addMessage('Sorry, there was an error: ' + error.message, false);
    });
  }

  // Add event listener for the main chat button only
  console.log('Setting up main chat button...');
  
  if (button) {
    console.log('Adding click listener to main chat button');
    button.addEventListener('click', toggleChat);
  }

  function showEmptyState() {
    var emptyState = document.createElement('div');
    emptyState.style.cssText = 'text-align: center; padding: 40px 20px;';
    
    // Create icon
    var iconDiv = document.createElement('div');
    iconDiv.style.cssText = 'width: 60px; height: 60px; background: linear-gradient(135deg, #8b5cf6, #3b82f6); border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;';
    iconDiv.innerHTML = '<span style="color: white; font-size: 24px;">✨</span>';
    
    // Create title
    var title = document.createElement('h3');
    title.style.cssText = 'margin: 0 0 8px; font-size: 20px; font-weight: 600; color: #111827;';
    title.textContent = config.title || 'AI Assistant';
    
    // Create subtitle
    var subtitle = document.createElement('p');
    subtitle.style.cssText = 'margin: 0 0 24px; font-size: 14px; color: #6b7280;';
    subtitle.textContent = config.subtitle || 'How can I help you today?';
    
    // Create suggestions grid
    var grid = document.createElement('div');
    grid.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 12px; max-width: 400px; margin: 0 auto;';
    
    // Create suggestion cards
    var suggestions = [
      { title: 'API Authentication', desc: 'Learn about API keys and auth', icon: '💬', color: '#3b82f6', bgColor: '#dbeafe' },
      { title: 'API Endpoints', desc: 'Explore available endpoints', icon: '📁', color: '#10b981', bgColor: '#dcfce7' },
      { title: 'Error Handling', desc: 'Best practices for errors', icon: '⚙️', color: '#f59e0b', bgColor: '#fef3c7' },
      { title: 'Code Examples', desc: 'Get implementation examples', icon: '🤖', color: '#8b5cf6', bgColor: '#f3e8ff' }
    ];
    
    suggestions.forEach(function(suggestion) {
      var card = document.createElement('div');
      card.style.cssText = 'background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; cursor: pointer; transition: all 0.2s; min-height: 80px;';
      card.innerHTML = '<div style="display: flex; align-items: center; gap: 12px;"><div style="width: 32px; height: 32px; background: ' + suggestion.bgColor + '; border-radius: 8px; display: flex; align-items: center; justify-content: center;"><span style="color: ' + suggestion.color + '; font-size: 16px;">' + suggestion.icon + '</span></div><div><div style="margin: 0 0 4px; font-weight: 500; font-size: 14px; color: #111827;">' + suggestion.title + '</div><p style="margin: 0; font-size: 12px; color: #6b7280; line-height: 1.4;">' + suggestion.desc + '</p></div></div>';
      card.onclick = function() { sendSuggestion(suggestion.title); };
      
      // Add hover effect
      card.onmouseenter = function() {
        card.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
      };
      card.onmouseleave = function() {
        card.style.boxShadow = 'none';
      };
      
      grid.appendChild(card);
    });
    
    emptyState.appendChild(iconDiv);
    emptyState.appendChild(title);
    emptyState.appendChild(subtitle);
    emptyState.appendChild(grid);
    messages.appendChild(emptyState);
  }

  function sendSuggestion(text) {
    // Clear empty state
    messages.innerHTML = '';
    // Send the suggestion as a message
    sendMessageWithText(text);
  }

  function sendMessageWithText(text) {
    if (!text.trim()) return;
    
    // Add user message
    addMessage(text, true);
    
    // Clear input
    var input = document.getElementById('chat-input');
    if (input) input.value = '';
    
    // Show loading indicator
    var loadingDiv = document.createElement('div');
    loadingDiv.id = 'loading-indicator';
    loadingDiv.style.cssText = 'padding: 16px; margin: 12px 0; border-radius: 16px; max-width: 85%; background: white; color: #374151; border: 1px solid #e5e7eb; border-bottom-left-radius: 4px; display: flex; align-items: center; gap: 8px;';
    loadingDiv.innerHTML = '<div style="width: 20px; height: 20px; border: 2px solid #e5e7eb; border-top: 2px solid #3b82f6; border-radius: 50%; animation: spin 1s linear infinite;"></div><span>AI is thinking...</span>';
    
    // Add CSS animation
    if (!document.getElementById('loading-styles')) {
      var style = document.createElement('style');
      style.id = 'loading-styles';
      style.textContent = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
      document.head.appendChild(style);
    }
    
    messages.appendChild(loadingDiv);
    messages.scrollTop = messages.scrollHeight;
    
    // Make API call to widget-chat endpoint
    fetch(config.apiUrl + '/api/widget-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: text,
        orgId: config.orgId
      })
    })
    .then(response => response.json())
    .then(data => {
      // Remove loading indicator
      var loading = document.getElementById('loading-indicator');
      if (loading) loading.remove();
      
      if (data.response) {
        addMessage(data.response, false);
      } else {
        addMessage('Sorry, I encountered an error. Please try again.', false);
      }
    })
    .catch(error => {
      console.error('Chat API error:', error);
      
      // Remove loading indicator
      var loading = document.getElementById('loading-indicator');
      if (loading) loading.remove();
      
      addMessage('Sorry, I\\'m having trouble connecting. Please try again.', false);
    });
  }


  document.body.appendChild(container);

  setTimeout(function() {
    showEmptyState();
  }, 1000);
  } // Close initializeWidget function
})();
`

  return new NextResponse(widgetScript, {
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  })
}
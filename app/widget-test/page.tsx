import Script from 'next/script'

export default function WidgetTestPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <div className="ml-2 text-xl font-bold text-gray-900">Avenai Widget Test</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">🧪 Avenai Widget Test</h1>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <div className="text-lg font-semibold text-blue-900 mb-4">How to Test the Widget:</div>
            <ol className="list-decimal list-inside space-y-2 text-blue-800">
              <li>Look for the 💬 button in the bottom right corner</li>
              <li>Click the button to open the chat window</li>
              <li>Type a message in the input field</li>
              <li>Click "Send" or press Enter</li>
              <li>You should see the AI response appear</li>
            </ol>
          </div>

          <div className="mb-8">
            <div className="text-lg font-semibold text-gray-900 mb-4">Expected Behavior:</div>
            <ul className="space-y-2">
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✅</span>
                <span>Widget button appears in bottom right</span>
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✅</span>
                <span>Chat window opens when clicked</span>
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✅</span>
                <span>Input field accepts text</span>
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✅</span>
                <span>Send button works</span>
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✅</span>
                <span>Enter key works</span>
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✅</span>
                <span>AI responds with helpful message</span>
              </li>
            </ul>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="text-lg font-semibold text-yellow-900 mb-4">Debug Information:</div>
            <p className="text-yellow-800 mb-4">Open the browser console (F12) to see debug logs:</p>
            <ul className="space-y-1 text-sm text-yellow-700">
              <li><code className="bg-yellow-100 px-2 py-1 rounded">"Setting up event listeners..."</code> - Widget initialization</li>
              <li><code className="bg-yellow-100 px-2 py-1 rounded">"Send button clicked!"</code> - Send button working</li>
              <li><code className="bg-yellow-100 px-2 py-1 rounded">"Enter key pressed, calling sendMessage"</code> - Enter key working</li>
              <li><code className="bg-yellow-100 px-2 py-1 rounded">"sendMessage called"</code> - Function execution</li>
              <li><code className="bg-yellow-100 px-2 py-1 rounded">"Widget chat response status: 200"</code> - API success</li>
            </ul>
          </div>

          <div className="mt-8 p-4 bg-gray-100 rounded-lg">
            <div className="font-semibold text-gray-900 mb-2">Test Message Suggestions:</div>
            <ul className="space-y-1 text-gray-700">
              <li>• "Hello, how are you?"</li>
              <li>• "What can you help me with?"</li>
              <li>• "Tell me about your capabilities"</li>
              <li>• "How do I integrate with APIs?"</li>
            </ul>
          </div>
        </div>
      </main>

      {/* Widget Script */}
      <Script 
        src="/api/widget?org=demo-org"
        strategy="afterInteractive"
      />
    </div>
  )
}

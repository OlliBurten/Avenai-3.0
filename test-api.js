async function testAPI() {
  try {
    console.log('Testing API...');
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question: 'Which Android permissions are required for the ID & Bio Verification SDK?',
        datasetId: 'cmh2vj3nd000c6whwghx40m36'
      })
    });
    
    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', data);
  } catch (error) {
    console.error('Error:', error);
  }
}

testAPI();

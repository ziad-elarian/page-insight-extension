document.addEventListener('DOMContentLoaded', async () => {
  const content = document.getElementById('content');
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: analyzePage,
    });
    
    const data = results[0].result;
    renderResults(data);
  } catch (err) {
    content.innerHTML = `<div class="error">Error: ${err.message}</div>`;
  }
});

function analyzePage() {
  const text = document.body.innerText || '';
  const words = text.trim().split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  const readingTime = Math.ceil(wordCount / 200); // 200 wpm average
  
  // Extract headings
  const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
    .map(h => h.innerText.trim())
    .filter(h => h.length > 0 && h.length < 80)
    .slice(0, 8);
  
  // Extract key topics (most frequent meaningful words)
  const stopWords = new Set(['the','a','an','is','are','was','were','be','been','being','have','has','had','do','does','did','will','would','could','should','may','might','must','shall','can','need','dare','ought','used','to','of','in','for','on','with','at','by','from','as','into','through','during','before','after','above','below','between','out','off','over','under','again','further','then','once','here','there','when','where','why','how','all','each','few','more','most','other','some','such','no','nor','not','only','own','same','so','than','too','very','just','because','but','and','or','if','while','about','up','it','its','this','that','these','those','i','me','my','myself','we','our','ours','ourselves','you','your','yours','yourself','he','him','his','himself','she','her','hers','herself','they','them','their','theirs','themselves','what','which','who','whom','this','that','these','those']);
  
  const wordFreq = {};
  words.forEach(w => {
    const clean = w.toLowerCase().replace(/[^a-z]/g, '');
    if (clean.length > 3 && !stopWords.has(clean)) {
      wordFreq[clean] = (wordFreq[clean] || 0) + 1;
    }
  });
  
  const topics = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word);
  
  // Generate a quick summary (first 2-3 sentences of main content)
  const paragraphs = Array.from(document.querySelectorAll('p'))
    .map(p => p.innerText.trim())
    .filter(p => p.length > 40)
    .slice(0, 3);
  
  const summary = paragraphs.join(' ').slice(0, 300) + (paragraphs.join(' ').length > 300 ? '...' : '');
  
  // Count links and images
  const linkCount = document.querySelectorAll('a').length;
  const imageCount = document.querySelectorAll('img').length;
  
  return {
    title: document.title,
    url: window.location.href,
    wordCount,
    readingTime,
    headings,
    topics,
    summary: summary || 'No summary available.',
    linkCount,
    imageCount
  };
}

function renderResults(data) {
  const content = document.getElementById('content');
  
  const topicsHtml = data.topics.map(t => `<span class="topic-tag">${t}</span>`).join('');
  const headingsHtml = data.headings.length > 0 
    ? data.headings.map(h => `<div style="font-size:11px;color:#94a3b8;margin:2px 0;">• ${h}</div>`).join('')
    : '<div style="font-size:11px;color:#64748b;">No headings found</div>';
  
  content.innerHTML = `
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-value">${data.wordCount.toLocaleString()}</div>
        <div class="stat-label">Words</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${data.readingTime} min</div>
        <div class="stat-label">Reading Time</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${data.linkCount}</div>
        <div class="stat-label">Links</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${data.imageCount}</div>
        <div class="stat-label">Images</div>
      </div>
    </div>
    
    <div class="topics">
      <h2>🔑 Key Topics</h2>
      ${topicsHtml || '<span style="color:#64748b;font-size:11px;">None detected</span>'}
    </div>
    
    <div class="topics">
      <h2>📑 Headings</h2>
      ${headingsHtml}
    </div>
    
    <div class="summary">
      <h2>📝 Quick Summary</h2>
      ${data.summary}
    </div>
    
    <button id="copyBtn">Copy Analysis to Clipboard</button>
  `;
  
  document.getElementById('copyBtn').addEventListener('click', () => {
    const text = `Page: ${data.title}\nURL: ${data.url}\nWords: ${data.wordCount}\nReading Time: ${data.readingTime} min\nTopics: ${data.topics.join(', ')}\nSummary: ${data.summary}`;
    navigator.clipboard.writeText(text);
    document.getElementById('copyBtn').textContent = '✓ Copied!';
    setTimeout(() => { document.getElementById('copyBtn').textContent = 'Copy Analysis to Clipboard'; }, 2000);
  });
}
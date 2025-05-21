const chatContainer = document.getElementById("chatContainer");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const themeToggle = document.getElementById("themeToggle");

const apiKey = "AIzaSyC34xxeu0LEWmtgq84nEHIfcys85DhQnQQ"; // Your API key here

let darkMode = localStorage.getItem("darkMode") === "true";

// Initialize theme
if (darkMode) {
  document.body.classList.add("dark");
  themeToggle.textContent = "☀️";
} else {
  themeToggle.textContent = "🌙";
}

// Scroll chat to bottom helper
function scrollToBottom() {
  setTimeout(() => {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }, 50);
}

// Add message bubble to chat
function addMessage(role, text) {
  const messageDiv = document.createElement("div");
  messageDiv.classList.add("message", role);

  if (role === "ai") {
    messageDiv.innerHTML = text;
  } else {
    messageDiv.textContent = text;
  }

  chatContainer.appendChild(messageDiv);
  scrollToBottom();
}

// Formatting AI text with bold and bullets replaced by • and line breaks
function formatAITextImproved(text) {
  let formatted = text.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  formatted = formatted.replace(/^\s*[-*]\s+(.*)$/gm, "• $1<br>");
  formatted = formatted.replace(/^\s*\d+\.\s+(.*)$/gm, "• $1<br>");
  formatted = formatted.replace(/\n/g, "<br>");
  return formatted;
}

// Pause/Resume control variables
let isPaused = false;
let isTyping = false;
let typingResolve; // For resolving the typing Promise when done

// Typewriter effect that inserts HTML (bold, br etc.) with pause/resume support
function typeWriterEffectHTML(element, htmlText) {
  return new Promise((resolve) => {
    isPaused = false;
    isTyping = true;
    typingResolve = resolve;

    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, "text/html");
    const nodes = Array.from(doc.body.childNodes);

    const fragments = [];

    function extractFragments(nodes) {
      nodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          node.textContent.split("").forEach((char) => fragments.push(char));
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          fragments.push(node.outerHTML);
        }
      });
    }

    extractFragments(nodes);

    element.innerHTML = "";
    let idx = 0;

    function addNext() {
      if (idx >= fragments.length) {
        isTyping = false;
        resolve();
        return;
      }

      if (isPaused) {
        // Wait and retry after some time
        setTimeout(addNext, 100);
        return;
      }

      element.innerHTML += fragments[idx];
      idx++;
      scrollToBottom();
      setTimeout(addNext, 20);
    }

    addNext();
  });
}

// Create and handle Pause/Resume button dynamically
function createPauseResumeButton() {
  let btn = document.getElementById("pauseResumeBtn");
  if (!btn) {
    btn = document.createElement("img");
    btn.id = "pauseResumeBtn";
    btn.src = "stop.png";
    btn.alt = "Pause";
    btn.title = "Pause/Resume";

    // 👉 Styling to match the Ask button height
    btn.style.height = sendBtn.offsetHeight + "px";
    btn.style.width = "auto";
    btn.style.marginLeft = "10px";
    btn.style.cursor = "pointer";

    sendBtn.parentNode.insertBefore(btn, sendBtn.nextSibling);

    btn.addEventListener("click", () => {
      if (!isTyping) return;

      if (!isPaused) {
        isPaused = true;
        userInput.disabled = false;
        sendBtn.disabled = false;
      } else {
        isPaused = false;
        userInput.disabled = true;
        sendBtn.disabled = true;
      }
    });
  }
  return btn;
}
// Pause/Resume button click handler
function handlePauseResumeButton() {
  const btn = document.getElementById("pauseResumeBtn");
  if (btn) {
    if (isPaused) {
      btn.src = "play.png";
      btn.alt = "Resume";
      btn.title = "Resume";
    } else {
      btn.src = "stop.png";
      btn.alt = "Pause";
      btn.title = "Pause";
    }
  }
}

// Remove pause/resume button
function removePauseResumeButton() {
  const btn = document.getElementById("pauseResumeBtn");
  if (btn) btn.remove();
}

// Send message and get AI response
async function sendMessage() {
  const question = userInput.value.trim();
  if (!question) {
    alert("Please enter a question!");
    return;
  }

  addMessage("user", question);
  userInput.value = "";
  userInput.disabled = true;
  sendBtn.disabled = true;

  // Create thinking message and append
  const thinkingMsg = document.createElement("div");
  thinkingMsg.classList.add("message", "ai");
  thinkingMsg.textContent = "Thinking... ⏳";
  chatContainer.appendChild(thinkingMsg);
  scrollToBottom();

  // Create pause/resume button
  const pauseBtn = createPauseResumeButton();

  try {
    const prompt = `
You are an intelligent and helpful AI assistant capable of answering queries from any domain. Please respond in a clear, friendly way with the following formatting rules:
- Use **bold** for headings using double asterisks like **Heading**
- Use bullet points with dashes or numbers for lists
- Avoid any markdown syntax in the final output; instead format HTML tags for bold and line breaks.
- Use <b> for bold text and <br> for line breaks
- Use • for bullet points
- Use <br> for line breaks
- Use <b> for bold text
- Use <br> for line breaks

User Query: ${question}

Answer:
`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=" + apiKey,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
        }),
      }
    );

    if (!response.ok) throw new Error("Failed to fetch AI response");

    const data = await response.json();
    const aiText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Sorry, I couldn't generate a response.";

    // Create AI message container BEFORE removing thinking
    const aiMessageDiv = document.createElement("div");
    aiMessageDiv.classList.add("message", "ai");

    // Replace thinking message with AI message
    chatContainer.replaceChild(aiMessageDiv, thinkingMsg);
    scrollToBottom();

    // Format AI text
    const formattedText = formatAITextImproved(aiText);

    // Start typing with pause/resume support
    await typeWriterEffectHTML(aiMessageDiv, formattedText);

    // After typing finishes:
    removePauseResumeButton();
  } catch (err) {
    // Remove thinking message if still there
    if (chatContainer.contains(thinkingMsg)) thinkingMsg.remove();

    addMessage("ai", "Oops! Something went wrong. Please try again.");
    console.error("API Error:", err);
    removePauseResumeButton();
  } finally {
    userInput.disabled = false;
    sendBtn.disabled = false;
    userInput.focus();
    isPaused = false;
    isTyping = false;
  }
}

// Initialize chat with a welcome message
addMessage("ai", "Hello! I'm your AI assistant. How can I help you today?");

// Set up dark mode toggle with only one button
themeToggle.addEventListener("click", () => {
  darkMode = !darkMode;
  localStorage.setItem("darkMode", darkMode);
  document.body.classList.toggle("dark", darkMode);
  themeToggle.textContent = darkMode ? "☀️" : "🌙";
});

// Send message on button click
sendBtn.addEventListener("click", async () => {
  await sendMessage();
});

// Send message on Enter key (without Shift)
userInput.addEventListener("keydown", async (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    await sendMessage();
  }
});



// ===== WHATSAPP ROBOT - Automated Response System =====

const WhatsAppRobot = {
  // Configuration
  config: {
    phoneNumber: '919650886633'
  },

  // Message Templates
  messages: {
    welcome: `Hi 👋 Welcome to Mochan Labs
IT Solutions & Services

We build:
• Web Apps
• Websites
• ERP / CRM Systems
• Data Migration

Are you an existing client or new?

Reply:
1️⃣ Existing Client
2️⃣ New Customer`,

    existingClient: `Thanks for reaching out 🙌

Please share:
• Application name
• Brief issue (login / bug / change request)

Our representative is available and looking to your request.`,

    newCustomer: `Great 👍 Welcome!

What service are you interested in?

1️⃣ Website / Web Application
2️⃣ School ERP
3️⃣ CRM / Office System
4️⃣ Custom Software

Talk to our team`
  },

  /**
   * Get the initial welcome message
   * @returns {string} Welcome message
   */
  getWelcomeMessage() {
    return this.messages.welcome;
  },

  /**
   * Get response based on user selection
   * @param {string} userInput - User's input/selection
   * @returns {string} Appropriate response message
   */
  getResponse(userInput) {
    const input = userInput.trim().toLowerCase();

    // Existing Client Flow
    if (input === '1' || input === 'existing client') {
      return this.messages.existingClient;
    }

    // New Customer Flow
    if (input === '2' || input === 'new customer') {
      return this.messages.newCustomer;
    }

    // Default response
    return 'Please select a valid option:\n1️⃣ Existing Client\n2️⃣ New Customer';
  },

  /**
   * Generate WhatsApp link with optional message
   * @param {string} message - Message to send (optional)
   * @returns {string} WhatsApp URL
   */
  generateWhatsAppLink(message = '') {
    const encodedMessage = encodeURIComponent(message);
    return encodedMessage
      ? `https://wa.me/${this.config.phoneNumber}?text=${encodedMessage}`
      : `https://wa.me/${this.config.phoneNumber}`;
  },

  /**
   * Update all WhatsApp links on the page with configured phone number
   */
  initializeLinks() {
    const waLink = this.generateWhatsAppLink();
    document.querySelectorAll('a[href*="wa.me"]').forEach(el => {
      el.href = waLink;
    });
  },

  /**
   * Update phone number configuration
   * @param {string} phoneNumber - New phone number (with country code)
   */
  setPhoneNumber(phoneNumber) {
    this.config.phoneNumber = phoneNumber;
  },

  /**
   * Update custom messages
   * @param {object} customMessages - Object with message keys to override
   */
  setMessages(customMessages) {
    this.messages = { ...this.messages, ...customMessages };
  }
};

// Initialize WhatsApp links when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    WhatsAppRobot.initializeLinks();
  });
} else {
  WhatsAppRobot.initializeLinks();
}

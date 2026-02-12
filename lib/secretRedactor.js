/**
 * Secret Redactor - Replaces sensitive data with placeholders before sending to AI
 * and substitutes them back when executing commands
 */

export class SecretRedactor {
  constructor() {
    this.secrets = new Map(); // Store original values
    this.counter = 0;
  }

  /**
   * Patterns to detect sensitive data
   */
  static PATTERNS = {
    // SSH private keys
    sshKey: /-----BEGIN (?:RSA |OPENSSH )?PRIVATE KEY-----[\s\S]+?-----END (?:RSA |OPENSSH )?PRIVATE KEY-----/g,
    
    // API keys and tokens
    apiKey: /\b(?:sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{36}|xoxb-[a-zA-Z0-9-]+)\b/g,
    
    // Passwords in common formats
    password: /(?:password|passwd|pwd)[\s=:]+['"]?([^'"\s]{8,})['"]?/gi,
    
    // JWT tokens
    jwt: /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
    
    // AWS keys
    awsKey: /\b(?:AKIA[0-9A-Z]{16}|aws_[a-z_]+_[a-zA-Z0-9]+)\b/g,
    
    // Generic secrets (long alphanumeric strings)
    genericSecret: /\b[a-f0-9]{32,128}\b/gi,
    
    // Database connection strings
    dbConnection: /(?:mongodb|mysql|postgresql|redis):\/\/[^:\s]+:[^@\s]+@[^\s]+/gi,
  };

  /**
   * Redact secrets from text, replacing them with placeholders
   * @param {string} text - Original text with secrets
   * @returns {string} - Text with placeholders
   */
  redact(text) {
    let redacted = text;
    this.secrets.clear();
    this.counter = 0;

    // Process each pattern type
    for (const [type, pattern] of Object.entries(SecretRedactor.PATTERNS)) {
      redacted = redacted.replace(pattern, (match) => {
        const placeholder = this.createPlaceholder(type);
        this.secrets.set(placeholder, match);
        return placeholder;
      });
    }

    return redacted;
  }

  /**
   * Create a unique placeholder for a secret
   * @param {string} type - Type of secret
   * @returns {string} - Placeholder string
   */
  createPlaceholder(type) {
    this.counter++;
    return `{{${type.toUpperCase()}_${this.counter}}}`;
  }

  /**
   * Substitute placeholders back with original secrets
   * @param {string} text - Text with placeholders
   * @returns {string} - Text with real secrets restored
   */
  substitute(text) {
    let result = text;

    for (const [placeholder, secret] of this.secrets.entries()) {
      // Use replaceAll to handle multiple occurrences
      result = result.split(placeholder).join(secret);
    }

    return result;
  }

  /**
   * Check if any secrets have been redacted
   * @returns {boolean} - True if secrets are stored
   */
  hasSecrets() {
    return this.secrets.size > 0;
  }

  /**
   * Get redaction report for debugging
   * @returns {object} - Report of redacted secrets
   */
  getReport() {
    const placeholders = Array.from(this.secrets.keys()).map(key => {
      const match = key.match(/{{(\w+)_\d+}}/);
      const type = match ? match[1] : 'UNKNOWN';
      return {
        placeholder: key,
        type: type
      };
    });

    return {
      secretsProtected: this.secrets.size,
      placeholders: placeholders,
      types: Array.from(new Set(placeholders.map(p => p.type)))
    };
  }

  /**
   * Clear all stored secrets
   */
  clear() {
    this.secrets.clear();
    this.counter = 0;
  }
}

// Test function
export function testSecretRedactor() {
  console.log('\n🔒 Testing Secret Redactor\n');
  
  const redactor = new SecretRedactor();

  // Test cases
  const testCases = [
    {
      name: 'SSH Key',
      input: 'Use this key: -----BEGIN OPENSSH PRIVATE KEY-----\nAbC123XyZ789==\n-----END OPENSSH PRIVATE KEY-----',
    },
    {
      name: 'API Key',
      input: 'My API key is sk-1234567890abcdefghijk',
    },
    {
      name: 'Password',
      input: 'Run ssh with password: SuperSecret123!',
    },
    {
      name: 'JWT Token',
      input: 'Auth token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    },
    {
      name: 'Database URL',
      input: 'Connect to mongodb://admin:MyP@ssw0rd@localhost:27017/mydb',
    },
    {
      name: 'Multiple Secrets',
      input: 'API key sk-abcd1234 and password: Secret123 with token eyJhbGci.eyJzdWI.signature',
    },
  ];

  testCases.forEach(({ name, input }) => {
    console.log(`📝 Test: ${name}`);
    console.log(`   Original: ${input.substring(0, 80)}${input.length > 80 ? '...' : ''}`);
    
    const redacted = redactor.redact(input);
    console.log(`   Redacted: ${redacted}`);
    
    const restored = redactor.substitute(redacted);
    console.log(`   Restored: ${restored.substring(0, 80)}${input.length > 80 ? '...' : ''}`);
    console.log(`   ✓ Match: ${input === restored ? 'YES' : 'NO'}`);
    console.log();
    
    redactor.clear();
  });

  // Test real-world scenario
  console.log('🌍 Real-world scenario test:\n');
  
  const userMessage = 'SSH into server using password: MySecretP@ss123 and run ls -la';
  console.log(`User input: "${userMessage}"`);
  
  const redactedMessage = redactor.redact(userMessage);
  console.log(`Sent to AI: "${redactedMessage}"`);
  
  // Simulate AI response
  const aiResponse = 'ssh user@server -p {{PASSWORD_1}} && ls -la';
  console.log(`AI returns: "${aiResponse}"`);
  
  const finalCommand = redactor.substitute(aiResponse);
  console.log(`Execute: "${finalCommand}"`);
  
  const report = redactor.getReport();
  console.log(`\nRedaction report:`, report);
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testSecretRedactor();
}

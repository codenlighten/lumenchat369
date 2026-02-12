/**
 * Web Server for Agent Orchestrator
 * 
 * Provides HTTP + WebSocket interface with full orchestrator integration
 * Features:
 * - JWT authentication
 * - Per-user memory isolation
 * - WebSocket real-time communication
 * - Orchestrator integration (Landscape + Plan + Base)
 * - Approval flow support
 */

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import dotenv from 'dotenv';
import { orchestrate, orchestrateSimple } from './lib/agentOrchestrator.js';
import { getMemoryContextString, clearMemory } from './lib/memorySystem.js';
import { loadNotes, clearNotes } from './lib/notesManager.js';
import path from 'path';

dotenv.config();

const PORT = process.env.WEB_PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'lumen-secret-change-me';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// User sessions
const userSessions = new Map();
const pendingApprovals = new Map();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

/**
 * Get user session
 */
function getUserSession(userId) {
  if (!userSessions.has(userId)) {
    userSessions.set(userId, {
      userId,
      simpleMode: false,
      processing: false,
      lastActivity: Date.now(),
      ws: null
    });
  }
  return userSessions.get(userId);
}

/**
 * Set user-specific file paths
 */
function setUserContext(userId) {
  process.env.USER_MEMORY_FILE = path.join(process.cwd(), `memory-${userId}.json`);
  process.env.USER_NOTES_FILE = path.join(process.cwd(), `notes-${userId}.md`);
}

/**
 * Clear user-specific context
 */
function clearUserContext() {
  delete process.env.USER_MEMORY_FILE;
  delete process.env.USER_NOTES_FILE;
}

/**
 * Send message to user's WebSocket
 */
function sendToUser(userId, message) {
  const session = userSessions.get(userId);
  if (session && session.ws && session.ws.readyState === 1) {
    session.ws.send(JSON.stringify(message));
  }
}

/**
 * Ask approval from user via WebSocket
 */
async function askApproval(userId, command, reasoning) {
  const approvalId = `${userId}-${Date.now()}`;
  
  return new Promise((resolve) => {
    pendingApprovals.set(approvalId, {
      command,
      reasoning,
      resolve,
      timestamp: Date.now()
    });
    
    sendToUser(userId, {
      type: 'approval_required',
      approvalId,
      command,
      reasoning
    });
    
    // Auto-deny after 5 minutes
    setTimeout(() => {
      if (pendingApprovals.has(approvalId)) {
        pendingApprovals.delete(approvalId);
        resolve(false);
      }
    }, 5 * 60 * 1000);
  });
}

// ============================================================================
// REST API Endpoints
// ============================================================================

/**
 * POST /api/login
 * Authenticate and get JWT token
 */
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  
  if (password === ADMIN_PASSWORD) {
    const token = jwt.sign(
      { userId: 'web-user', role: 'admin' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({ success: true, token });
  } else {
    res.status(401).json({ success: false, message: 'Invalid password' });
  }
});

/**
 * GET /api/memory
 * Get memory context
 */
app.get('/api/memory', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const decoded = jwt.verify(token, JWT_SECRET);
    
    setUserContext(decoded.userId);
    const memory = await getMemoryContextString();
    clearUserContext();
    
    res.json({ success: true, memory });
  } catch (error) {
    res.status(401).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/clear-memory
 * Clear user's memory
 */
app.post('/api/clear-memory', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const decoded = jwt.verify(token, JWT_SECRET);
    
    setUserContext(decoded.userId);
    await clearMemory();
    await clearNotes();
    clearUserContext();
    
    res.json({ success: true });
  } catch (error) {
    res.status(401).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/notes
 * Get agent's notes
 */
app.get('/api/notes', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const decoded = jwt.verify(token, JWT_SECRET);
    
    setUserContext(decoded.userId);
    const notes = await loadNotes();
    clearUserContext();
    
    res.json({ success: true, notes });
  } catch (error) {
    res.status(401).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/status
 * Get server status
 */
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    status: 'online',
    activeUsers: userSessions.size,
    pendingApprovals: pendingApprovals.size,
    uptime: process.uptime()
  });
});

// ============================================================================
// WebSocket Handler
// ============================================================================

wss.on('connection', (ws) => {
  let userId = null;
  let session = null;
  
  console.log('New WebSocket connection');
  
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      // Handle authentication
      if (message.type === 'auth') {
        try {
          const decoded = jwt.verify(message.token, JWT_SECRET);
          userId = decoded.userId;
          session = getUserSession(userId);
          session.ws = ws;
          
          ws.send(JSON.stringify({
            type: 'auth_success',
            userId
          }));
          
          console.log(`User ${userId} authenticated via WebSocket`);
        } catch (error) {
          ws.send(JSON.stringify({
            type: 'auth_error',
            message: 'Invalid token'
          }));
          ws.close();
        }
        return;
      }
      
      // Require authentication for other messages
      if (!userId) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Not authenticated'
        }));
        return;
      }
      
      // Handle query
      if (message.type === 'query') {
        if (session.processing) {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Already processing a request'
          }));
          return;
        }
        
        session.processing = true;
        session.lastActivity = Date.now();
        setUserContext(userId);
        
        try {
          ws.send(JSON.stringify({ type: 'processing' }));
          
          const orchestrateFunc = session.simpleMode ? orchestrateSimple : orchestrate;
          
          const result = await orchestrateFunc(message.query, {
            userContext: message.context,
            
            askApproval: async (command, reasoning) => {
              return await askApproval(userId, command, reasoning);
            },
            
            onThinking: async (iteration) => {
              ws.send(JSON.stringify({
                type: 'thinking',
                iteration
              }));
            },
            
            onResponse: async (response, iteration) => {
              ws.send(JSON.stringify({
                type: 'response',
                response,
                iteration
              }));
            }
          });
          
          ws.send(JSON.stringify({
            type: 'complete',
            iterations: result.iterations,
            landscape: result.landscape,
            plan: result.plan
          }));
          
        } catch (error) {
          console.error('Error processing query:', error);
          ws.send(JSON.stringify({
            type: 'error',
            message: error.message
          }));
        } finally {
          session.processing = false;
          clearUserContext();
        }
      }
      
      // Handle approval response
      else if (message.type === 'approval') {
        const { approvalId, approved } = message;
        
        if (pendingApprovals.has(approvalId)) {
          const approval = pendingApprovals.get(approvalId);
          pendingApprovals.delete(approvalId);
          approval.resolve(approved);
          
          ws.send(JSON.stringify({
            type: 'approval_processed',
            approvalId,
            approved
          }));
        }
      }
      
      // Handle simple mode toggle
      else if (message.type === 'toggle_simple') {
        session.simpleMode = !session.simpleMode;
        ws.send(JSON.stringify({
          type: 'simple_mode',
          enabled: session.simpleMode
        }));
      }
      
      // Handle clear
      else if (message.type === 'clear') {
        setUserContext(userId);
        await clearMemory();
        await clearNotes();
        clearUserContext();
        
        ws.send(JSON.stringify({
          type: 'cleared'
        }));
      }
      
    } catch (error) {
      console.error('WebSocket error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message
      }));
    }
  });
  
  ws.on('close', () => {
    if (userId && session) {
      session.ws = null;
      console.log(`User ${userId} disconnected`);
    }
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Cleanup old sessions every hour
setInterval(() => {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  
  for (const [userId, session] of userSessions.entries()) {
    if (now - session.lastActivity > maxAge && !session.ws) {
      userSessions.delete(userId);
      console.log(`Cleaned up session for user ${userId}`);
    }
  }
  
  // Clean up expired approvals
  for (const [approvalId, approval] of pendingApprovals.entries()) {
    if (now - approval.timestamp > 5 * 60 * 1000) {
      approval.resolve(false);
      pendingApprovals.delete(approvalId);
    }
  }
}, 60 * 60 * 1000);

// Start server
server.listen(PORT, () => {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║     🤖 Agent Orchestrator Web Server                      ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log(`\n🌐 HTTP Server: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
  console.log(`📊 Status endpoint: http://localhost:${PORT}/api/status`);
  console.log(`\n✨ Features:`);
  console.log(`  - Full orchestrator integration`);
  console.log(`  - Per-user memory isolation`);
  console.log(`  - Real-time WebSocket communication`);
  console.log(`  - Approval flow support`);
  console.log(`  - Landscape + Plan + Base agents`);
  console.log(`\n🔐 Default password: ${ADMIN_PASSWORD === 'admin123' ? '⚠️  CHANGE IN PRODUCTION!' : '✓ Custom'}`);
  console.log();
});

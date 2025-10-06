# LangBot

A Next.js-based AI-powered language learning application that helps users practice their target language through natural conversation with an intelligent tutor.

## 🌟 Features

- **Interactive Chat Interface**: Natural conversation-based language learning
- **Multi-language Support**: Configurable native and target languages
- **Real-time Translation**: Translate messages between target and native languages
- **Grammar Correction**: Automatic spelling and grammar correction
- **Topic Tracking**: Monitors conversation topics for better context
- **Conversation History**: Maintains chat history for contextual responses

## 🏗️ Architecture

### Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **AI Provider**: Mistral AI (mistral-small-latest)
- **UI Components**: React with custom components
- **Styling**: Tailwind CSS

### Project Structure

```
├── README.md
├── __tests__
│   ├── integration
│   │   ├── chat.test.ts
│   │   ├── correct.test.ts
│   │   └── tranlsate.test.ts
│   └── unit
│       ├── chat.test.ts
│       ├── correct.test.ts
│       └── translate.test.ts
├── imgs
├── public
├── src
│   ├── app
│   │   ├── api
│   │   │   ├── chat
│   │   │   │   └── route.ts
│   │   │   ├── correct
│   │   │   │   └── route.ts
│   │   │   └── translate
│   │   │       └── route.ts
│   │   ├── favicon.ico
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components
│   │   └── ui
│   │       ├── chat
│   │       │   ├── ChatHeader.tsx
│   │       │   ├── ChatInput.tsx
│   │       │   └── Message.tsx
│   │       ├── indicators
│   │       │   └── LoadingIndicator.tsx
│   │       ├── panels
│   │       │   └── TopicsPanel.tsx
│   │       └── states
│   │           ├── EmptyState.tsx
│   │           └── ErrorDisplay.tsx
│   └── lib
│       ├── api
│       │   ├── chat.ts
│       │   ├── correct.ts
│       │   ├── index.ts
│       │   └── translate.ts
│       ├── config
│       │   └── language.ts
│       └── types
│           ├── chat.ts
│           ├── index.ts
│           ├── language.ts
│           └── mistral.ts
```
```mermaid
graph TB
    %% Top Layer - Page
    Page["page.tsx<br/>Main Chat Page<br/><br/>State Management:<br/>• messages<br/>• loading<br/>• error<br/>• context<br/>• languageConfig"]
    
    %% UI Components Layer
    subgraph UI["UI Components Layer"]
        direction LR
        Header["ChatHeader"]
        Input["ChatInput"]
        Msg["Message"]
        Loading["LoadingIndicator"]
        Error["ErrorDisplay"]
        Empty["EmptyState"]
        Topics["TopicsPanel"]
    end
    
    %% Client Library Layer
    subgraph ClientLib["Client Library"]
        direction TB
        subgraph Config["Configuration"]
            LangCfg["@/lib/config/language.ts<br/>(get/set)"]
            TypesBarrel["@/lib/types<br/>(index.ts)"]
        end
        
        subgraph API["API Layer (code)"]
            ClientBarrel["@/lib/api (index.ts)<br/><br/>API Abstraction:<br/>• send()<br/>• translateMessage()<br/>• correctMessage()"]
            ChatApi["chat.ts<br/>(send)"]
            TransApi["translate.ts<br/>(translateMessage)"]
            CorrectApi["correct.ts<br/>(correctMessage)"]
        end
    end
    
    %% API Routes Layer
    subgraph Routes["API Routes"]
        direction LR
        ChatRoute["/api/chat"]
        TransRoute["/api/translate"]
        CorrectRoute["/api/correct"]
    end
    
    %% External Services
    Mistral["Mistral AI API"]
    
    %% Connections - Top to Bottom Flow
    Page --> UI
    Page --> ClientLib
    
    ClientBarrel --> ChatApi
    ClientBarrel --> TransApi
    ClientBarrel --> CorrectApi
    
    ChatApi -.-> ChatRoute
    TransApi -.-> TransRoute
    CorrectApi -.-> CorrectRoute
    
    ChatRoute --> Mistral
    TransRoute --> Mistral
    CorrectRoute --> Mistral
    
    %% Styling
    classDef pageStyle fill:#e1f5ff,stroke:#01579b,stroke-width:3px
    classDef uiStyle fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef apiStyle fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef routeStyle fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px
    classDef externalStyle fill:#ffebee,stroke:#b71c1c,stroke-width:2px
    
    class Page pageStyle
    class Header,Input,Msg,Loading,Error,Empty,Topics uiStyle
    class ClientBarrel,ChatApi,TransApi,CorrectApi apiStyle
    class ChatRoute,TransRoute,CorrectRoute routeStyle
    class Mistral externalStyle
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm
- Mistral AI API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Yvesei/LangBot
cd LangBot
```

2. Install dependencies:
```bash
pnpm install
```

3. Create a `.env.local` file in the root directory:
```env
MISTRAL_API_KEY=your_mistral_api_key_here
```

4. Run the development server:
```bash
pnpm dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## 📖 Usage

### Initial Setup

1. **Select Languages**: On first load, choose your native language and target language
2. **Start Chatting**: Begin practicing your target language with the AI tutor


```mermaid
sequenceDiagram
  %% Application Initialization Flow
  participant User as User
  participant UI as "Next.js UI<br>(page.tsx)"
  participant Empty as "EmptyState<br>Component"
  participant LangCfg as "@/lib/config/language"
  participant State as "State<br>(useState)"

  User->>UI: Open application
  activate UI

  UI->>State: Initialize states<br>(messages, loading, context)
  UI->>UI: Check languageSelected<br>(false)

  UI->>Empty: Render EmptyState
  activate Empty

  Empty-->>User: Display language selection
  deactivate Empty

  User->>Empty: Select native & target languages
  activate Empty

  Empty->>UI: onLanguageSelect(config)
  deactivate Empty

  UI->>LangCfg: setLanguageConfig(config)
  activate LangCfg
  LangCfg->>LangCfg: Store language configuration
  deactivate LangCfg

  UI->>State: setLanguageSelected(true)
  UI->>UI: Enable chat input

  UI-->>User: Ready to chat
  deactivate UI
```

### Features Usage

#### Translation
- Messages can be translated between target and native languages
- Uses the language configuration set at startup

![original message (before translation)](./imgs/before_translation.png)
![Translated message (after translation)](./imgs/translation.gif)


#### Grammar Correction
- Automatic detection of spelling and grammar mistakes
- Returns `[CORRECT]` if no mistakes found

![Original message (before correction)](./imgs/before_correction.png)
![Corrected message (after correction)](./imgs/correction.gif)

#### Topic Tracking
- Automatically detects discussion topics (food, travel, work, hobbies, family)
- Displays topics in the sidebar
- Helps maintain conversation context

## 🔌 API Endpoints

### POST `/api/chat`

Main conversation endpoint.

**Request Body:**
```json
{
  "prompt": "Hello, how are you?",
  "history": [
    {
      "role": "user",
      "content": "Previous message"
    }
  ],
  "context": {
    "learningLanguage": "French",
    "userLevel": "beginner",
    "topicsDiscussed": ["food"],
    "commonMistakes": []
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "I'm doing well, thank you! How about you?"
}
```

```mermaid
sequenceDiagram
  %% Language Learning Chatbot - Main Chat Flow
  participant User as User
  participant UI as "Next.js UI<br>(page.tsx)"
  participant Context as "Context Store<br>(In-Memory)"
  participant ClientLib as "Client Library<br>('@/lib/api')"
  participant ChatAPI as "Chat Route<br>(/api/chat)"
  participant Mistral as "Mistral AI"

  User->>UI: Type message & send
  activate UI

  UI->>UI: Create user message object
  UI->>Context: Update messages state

  UI->>ClientLib: send(prompt, history, context)
  activate ClientLib

  ClientLib->>ClientLib: Validate input
  ClientLib->>ClientLib: Trim prompt
  ClientLib->>ClientLib: Slice last 10 messages

  ClientLib->>ChatAPI: POST /api/chat<br>{prompt, history, context}
  activate ChatAPI

  ChatAPI->>ChatAPI: Validate request
  ChatAPI->>ChatAPI: Check MISTRAL_API_KEY

  ChatAPI->>ChatAPI: Create contextual prompt<br>(learningLanguage, userLevel, etc.)
  ChatAPI->>ChatAPI: Build messages array<br>(system + history + user)

  ChatAPI->>Mistral: POST /v1/chat/completions<br>{model, messages, max_tokens, temperature}
  activate Mistral

  Mistral->>Mistral: Process request
  Mistral->>Mistral: Generate response

  Mistral-->>ChatAPI: {choices: [{message: {content}}]}
  deactivate Mistral

  ChatAPI->>ChatAPI: Extract AI message
  ChatAPI->>ChatAPI: Validate response

  ChatAPI-->>ClientLib: {success: true, message}
  deactivate ChatAPI

  ClientLib-->>UI: ChatResponse
  deactivate ClientLib

  UI->>UI: Create assistant message object
  UI->>Context: Add assistant message
  UI->>UI: Update learning context<br>(topics, mistakes)

  UI-->>User: Display AI response
  deactivate UI
```


### POST `/api/translate`

Translates text between configured languages.

**Request Body:**
```json
{
  "content": "Bonjour, comment allez-vous?",
  "languageConfig": {
    "targetLanguage": "fr",
    "nativeLanguage": "en"
  }
}
```

**Response:**
```json
{
  "success": true,
  "translation": "Hello, how are you?"
}
```

```mermaid
sequenceDiagram
  %% Translation Flow
  participant User as User
  participant Msg as "Message<br>Component"
  participant ClientLib as "Client Library<br>('@/lib/api')"
  participant TransAPI as "Translate Route<br>(/api/translate)"
  participant Mistral as "Mistral AI"
  participant LangCfg as "@/lib/config/language<br>(getLanguageConfig)"

  User->>Msg: Click translate button
  activate Msg

  Msg->>ClientLib: translateMessage(content)
  activate ClientLib

  ClientLib->>LangCfg: getLanguageConfig()
  LangCfg-->>ClientLib: {nativeLanguage, targetLanguage}

  ClientLib->>TransAPI: POST /api/translate<br>{content, languageConfig}
  activate TransAPI

  TransAPI->>TransAPI: Validate content
  TransAPI->>TransAPI: Create translation prompt<br>"Translate from X to Y"

  TransAPI->>Mistral: POST /v1/chat/completions<br>{model, messages, temperature: 0.0}
  activate Mistral

  Mistral->>Mistral: Translate text
  Mistral-->>TransAPI: {choices: [{message: {content}}]}
  deactivate Mistral

  TransAPI-->>ClientLib: {success: true, translation}
  deactivate TransAPI

  ClientLib-->>Msg: {success: true, translation}
  deactivate ClientLib

  Msg->>Msg: Display translation
  Msg-->>User: Show translated text
  deactivate Msg
```

### POST `/api/correct`

Corrects spelling and grammar mistakes.

**Request Body:**
```json
{
  "content": "I has a appel"
}
```

**Response:**
```json
{
  "success": true,
  "correctedContent": "I have an apple"
}
```

```mermaid
sequenceDiagram
  %% Application Initialization Flow
  participant User as User
  participant UI as "Next.js UI<br>(page.tsx)"
  participant Empty as "EmptyState<br>Component"
  participant LangCfg as "@/lib/config/language"
  participant State as "State<br>(useState)"

  User->>UI: Open application
  activate UI

  UI->>State: Initialize states<br>(messages, loading, context)
  UI->>UI: Check languageSelected<br>(false)

  UI->>Empty: Render EmptyState
  activate Empty

  Empty-->>User: Display language selection
  deactivate Empty

  User->>Empty: Select native & target languages
  activate Empty

  Empty->>UI: onLanguageSelect(config)
  deactivate Empty

  UI->>LangCfg: setLanguageConfig(config)
  activate LangCfg
  LangCfg->>LangCfg: Store language configuration
  deactivate LangCfg

  UI->>State: setLanguageSelected(true)
  UI->>UI: Enable chat input

  UI-->>User: Ready to chat
  deactivate UI
```



## 🎯 AI Tutor Behavior

The AI tutor is designed to:

- **Adapt to User Level**: Adjusts language complexity based on proficiency
- **Encourage Expression**: Promotes natural conversation without harsh corrections
- **Maintain Context**: References previous topics and common mistakes
- **Stay Engaging**: Asks follow-up questions to continue conversations
- **Be Patient**: Creates a supportive learning environment


## 🔧 Configuration

### Language Configuration

Set languages programmatically:

```typescript
import { setLanguageConfig } from '@/lib/prompts';

setLanguageConfig({
  nativeLanguage: 'en',
  targetLanguage: 'fr'
});
```

### Conversation Context

```typescript
interface ConversationContext {
  messages: ChatMessage[];
  learningLanguage?: string;
  userLevel?: 'beginner' | 'intermediate' | 'advanced';
  topicsDiscussed?: string[];
  commonMistakes?: string[];
}
```

## 🔐 Security

- API keys stored in environment variables
- Trimmed user inputs to prevent injection
- Error messages don't expose sensitive information

## 📊 Performance Considerations

- **Message History Limit**: Last 8-10 messages sent to AI (token optimization)
- **Max Tokens**: 500 tokens per response
- **Temperature**: 0.7 for natural conversation, 0.0 for corrections
- **Model**: mistral-small-latest (balance of speed and quality)

## 🧪 Testing

Run tests:
```bash
pnpm test
```

## 🗺️ Roadmap
- [x] add tests
- [ ] user input validation and safe output parsing
- [ ] CI/CD
- [ ] User authentication
- [ ] Voice input/output
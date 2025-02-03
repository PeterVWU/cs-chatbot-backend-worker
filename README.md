# CS Chatbot Backend Worker

## Overview

The **CS Chatbot Backend Worker** is a serverless backend solution built with Cloudflare Workers. It processes customer messages, detects user intents, and generates tailored responses on-the-fly. The worker integrates with multiple external services including:

- **Cloudflare D1 Database:** Persists conversation history and message logs.
- **Magento API:** Retrieves order details and tracking information.
- **Zoho Desk:** Creates support tickets when needed.
- **Vectorize Service:** Supports FAQ embedding and search.
- **Worker AI:** Use llama-2-7b for intents detection and text generation. 

## Key Features

- **Conversational Orchestration:**  
  Handles the complete flow of processing a user message—from conversation management, intent detection, data enrichment, to response generation and validation.
  
- **Intent-Driven Processing:**  
  Supports multiple intents such as order inquiries, FAQ search, and support ticket creation. For example, the `OrchestrationModule` processes the message and takes appropriate actions based on the detected intent.

- **Feedback Handling:**  
  Recognizes specific feedback triggers (like "FEEDBACK_HELPFUL" or "FEEDBACK_UNHELPFUL") to adjust conversation flow, either by confirming helpfulness or initiating the ticket creation process.

- **Service Integrations:**  
  - **Magento:** Retrieves order details when an "order" intent is detected.
  - **FAQ Module:** Searches FAQs if the intent is "other".
  - **Ticketing:** Creates support tickets via Zoho Desk when a ticketing scenario is detected.

- **Response Validation:**  
  Validates AI-generated responses and applies fallback responses in case of issues.

## The Orchestration Module

The orchestration module is at the heart of the solution. It manages conversation state and coordinates intent detection, data enrichment, response generation, and validation. Below is an excerpt from the orchestration module:


## Tech Stack

- **Cloudflare Workers:** Serverless platform to run the application at the edge.
- **TypeScript:** Provides strong typing and modern JavaScript features.
- **Cloudflare Wrangler:** CLI tool for developing and deploying Cloudflare Workers.
- **Cloudflare D1 Database:** SQL database for persisting conversation history.
- **Magento API Integration:** Retrieves order details and tracking information.
- **Zoho Desk Integration:** Facilitates the creation of support tickets.
- **Vitest:** Testing framework for unit and integration tests.

## Project Structure

- **/src/modules/orchestration:**  
  Contains the `OrchestrationModule` which coordinates all aspects of message processing.

- **/src/modules/chat-history:**  
  Manages conversation history, including creation, retrieval, and saving of records.

- **/src/modules/intent:**  
  Detects the intent behind user messages using AI.

- **/src/modules/faq:**  
  Provides FAQ search functionalities for common customer inquiries.

- **/src/modules/magento:**  
  Connects with the Magento API to fetch order information.

- **/src/modules/message-generator:**  
  Generates responses based on detected intents and enriched data.

- **/src/modules/message-validator:**  
  Validates responses to ensure quality and provides fallback options if necessary.

- **/src/modules/ticket:**  
  Integrates with Zoho Desk for creating support tickets.

## Getting Started

### Prerequisites

- **Node.js** (v14 or later)
- **Wrangler CLI** installed globally:
  ```bash
  npm install -g wrangler
  ```
- A Cloudflare account with access to Workers and D1 Database.
- Environment variables configured for external integrations in.dev.vars file (e.g., `MAGENTO_API_TOKEN`).

### Installation

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/PeterVWU/cs-chatbot-backend-worker
   cd cs-chatbot-backend-worker
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Setup local envirment variables:**

    create `.dev.vars` file in the root directy, and add the magento token
    ```bash
    MAGENTO_API_TOKEN = "xxxxxxx" 
    ```  

### Running Locally

To develop and test the worker locally, run:
   ```bash
   npm run dev
   ```
This starts the Cloudflare Workers development server (default URL: `http://localhost:8787`).

### Testing

Run the tests using Vitest:
   ```bash
   npm run test
   ```

## Configuration

- **wrangler.json:**  
  Defines the project configuration, including the main entry point (`src/index.ts`), bindings (e.g., D1 database, AI, vectorize, Zoho), and other deployment settings.

- **Environment Variables:**  
  Store sensitive information like API tokens and service URLs, and reference them in your configuration. Make sure to keep these secure.
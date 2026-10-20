import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Plus,
  MessageSquare,
  Send,
  Menu,
  Sparkles,
  Trash2,
  Bot,
  User,
} from "lucide-react";
import "./style.css";

function App() {
  const [chats, setChats] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const activeChat = chats.find((chat) => chat.id === activeId);
  const messages = activeChat?.messages || [];

  function newChat() {
    setActiveId(null);
    setMessage("");
  }

  function selectChat(id) {
    setActiveId(id);
    setMessage("");
  }

  function deleteChat(id) {
    setChats((previous) => previous.filter((chat) => chat.id !== id));
    if (activeId === id) setActiveId(null);
  }

  async function sendMessage(text = message) {
    const content = text.trim();
    if (!content || loading) return;

    const id = activeId || crypto.randomUUID();
    const firstMessage = {
      role: "user",
      content,
    };

    const existingChat = chats.find((chat) => chat.id === id);

    const updatedChat = existingChat
      ? {
          ...existingChat,
          title: existingChat.messages.length
            ? existingChat.title
            : content.slice(0, 35),
          messages: [...existingChat.messages, firstMessage],
        }
      : {
          id,
          title: content.slice(0, 35),
          messages: [firstMessage],
        };

    setChats((previous) =>
      existingChat
        ? previous.map((chat) => (chat.id === id ? updatedChat : chat))
        : [updatedChat, ...previous]
    );

    setActiveId(id);
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedChat.messages,
        }),
      });

      if (!response.ok) {
        throw new Error("La risposta del server non è disponibile.");
      }

      const data = await response.json();
      const answer =
        data.reply || data.message || data.content ||
        "Non ho ricevuto una risposta valida dal server.";

      setChats((previous) =>
        previous.map((chat) =>
          chat.id === id
            ? {
                ...chat,
                messages: [
                  ...chat.messages,
                  { role: "assistant", content: answer },
                ],
              }

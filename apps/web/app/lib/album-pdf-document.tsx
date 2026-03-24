/**
 * Phase 4-1: 대화 앨범 PDF 템플릿
 */
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { AlbumMessage } from "./album-generator.server";

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: "Helvetica",
    fontSize: 11,
  },
  title: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: "center",
  },
  messageRow: {
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  messageRowUser: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 12,
  },
  bubble: {
    maxWidth: "75%",
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#f0f0f0",
  },
  bubbleUser: {
    backgroundColor: "#ec2b8c",
    padding: 10,
    borderRadius: 12,
    maxWidth: "75%",
  },
  bubbleText: {
    color: "#333",
  },
  bubbleTextUser: {
    color: "#fff",
  },
  timestamp: {
    fontSize: 9,
    color: "#888",
    marginTop: 4,
  },
});

interface AlbumPdfDocumentProps {
  messages: AlbumMessage[];
  characterName: string;
}

const MESSAGES_PER_PAGE = 15;

export function AlbumPdfDocument({
  messages,
  characterName,
}: AlbumPdfDocumentProps) {
  const pages: AlbumMessage[][] = [];
  for (let i = 0; i < messages.length; i += MESSAGES_PER_PAGE) {
    pages.push(messages.slice(i, i + MESSAGES_PER_PAGE));
  }
  if (pages.length === 0) pages.push([]);

  return (
    <Document>
      {pages.map((pageMessages, idx) => (
        <Page key={idx} size="A4" style={styles.page}>
          {idx === 0 && (
            <Text style={styles.title}>{characterName}와의 대화 앨범</Text>
          )}
          {pageMessages.map((m) =>
            m.role === "user" ? (
              <View key={m.id} style={styles.messageRowUser}>
                <View style={styles.bubbleUser}>
                  <Text style={styles.bubbleTextUser}>{m.content}</Text>
                  <Text style={[styles.timestamp, { color: "#fff9" }]}>
                    {new Date(m.createdAt).toLocaleString("ko-KR")}
                  </Text>
                </View>
              </View>
            ) : (
              <View key={m.id} style={styles.messageRow}>
                <View style={styles.bubble}>
                  <Text style={styles.bubbleText}>{m.content}</Text>
                  <Text style={styles.timestamp}>
                    {m.characterName} · {new Date(m.createdAt).toLocaleString("ko-KR")}
                  </Text>
                </View>
              </View>
            )
          )}
        </Page>
      ))}
    </Document>
  );
}

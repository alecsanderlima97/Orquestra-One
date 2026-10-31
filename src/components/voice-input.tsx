"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";

type RecognitionAlternative = { transcript: string };
type RecognitionResult = { isFinal: boolean; length: number; [index: number]: RecognitionAlternative };
type RecognitionEvent = { results: { length: number; [index: number]: RecognitionResult } };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type RecognitionConstructor = new () => Recognition;

const VOICE_ERRORS: Record<string, string> = {
  "not-allowed": "O microfone está bloqueado. Libere o acesso nas permissões do navegador (o site precisa estar em https).",
  "service-not-allowed": "O navegador não liberou o reconhecimento de voz neste site.",
  "audio-capture": "Nenhum microfone foi encontrado.",
  network: "O ditado precisa de internet.",
  "language-not-supported": "Este navegador não reconhece português para ditado.",
};

function getRecognitionConstructor(): RecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const scope = window as unknown as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

function joinText(base: string, addition: string) {
  if (!base) return addition;
  if (!addition) return base;
  return /\s$/.test(base) ? `${base}${addition}` : `${base} ${addition}`;
}

/** Botão de ditado: transcreve a fala (pt-BR) e acrescenta o texto ao campo. */
export function VoiceDictationButton({ value, onChange }: { value: string; onChange: (text: string) => void }) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState("");
  const recognitionRef = useRef<Recognition | null>(null);
  const wantedRef = useRef(false);
  const baseRef = useRef("");
  const sessionRef = useRef("");
  const latestValue = useRef(value);
  const latestOnChange = useRef(onChange);

  useEffect(() => {
    latestValue.current = value;
    latestOnChange.current = onChange;
  });

  useEffect(() => {
    setSupported(getRecognitionConstructor() !== null);
    return () => {
      wantedRef.current = false;
      recognitionRef.current?.abort();
    };
  }, []);

  function start() {
    const Constructor = getRecognitionConstructor();
    if (!Constructor) return;
    setMessage("");
    baseRef.current = latestValue.current;
    sessionRef.current = "";
    wantedRef.current = true;
    const recognition = new Constructor();
    recognition.lang = "pt-BR";
    recognition.interimResults = true;
    // No Android o modo contínuo repete palavras; lá reiniciamos a escuta a cada frase.
    recognition.continuous = !/android/i.test(navigator.userAgent);
    recognition.onresult = (event) => {
      let transcript = "";
      for (let index = 0; index < event.results.length; index += 1) transcript += event.results[index][0].transcript;
      sessionRef.current = transcript.trim();
      latestOnChange.current(joinText(baseRef.current, sessionRef.current));
    };
    recognition.onerror = (event) => {
      const text = VOICE_ERRORS[event.error];
      if (text) setMessage(text);
      if (event.error === "not-allowed" || event.error === "service-not-allowed" || event.error === "audio-capture") wantedRef.current = false;
    };
    recognition.onend = () => {
      baseRef.current = joinText(baseRef.current, sessionRef.current);
      sessionRef.current = "";
      if (wantedRef.current) {
        try {
          recognition.start();
          return;
        } catch {
          /* não conseguiu reiniciar: encerra abaixo */
        }
      }
      wantedRef.current = false;
      setListening(false);
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      wantedRef.current = false;
      setMessage("Não foi possível iniciar o microfone.");
    }
  }

  function stop() {
    wantedRef.current = false;
    recognitionRef.current?.stop();
    setListening(false);
  }

  if (!supported) return null;
  return <span className="voice-control">
    <button type="button" className={`voice-button ${listening ? "voice-button-on" : ""}`} onClick={listening ? stop : start} aria-pressed={listening}>
      {listening ? <Square size={13} /> : <Mic size={14} />}{listening ? "Parar" : "Ditar"}
    </button>
    {listening && <small className="voice-hint" role="status">Ouvindo… fale e toque em Parar para editar.</small>}
    {message && <small className="voice-message" role="alert">{message}</small>}
  </span>;
}

"use client";
import { useEffect, useRef } from "react";
import Editor, { loader, type OnMount } from "@monaco-editor/react";
import * as monaco from "monaco-editor/editor/editor.api";
import "monaco-editor/languages/definitions/javascript/register";
import type { Origin } from "@/lib/contracts";
import { useUiEnvironment } from "@/components/ui/environment";
import styles from "./replay.module.css";
if(typeof window!=="undefined"){
 const environment=globalThis as typeof globalThis&{MonacoEnvironment?:monaco.Environment};
 environment.MonacoEnvironment??={getWorker:()=>new Worker(new URL("/play/editor-assets/editor/editor.worker.js",window.location.origin),{type:"module"})};
 loader.config({monaco});
}
export function ReplayEditor({code,origins,showOrigin,highlightLine}:{code:string;origins:Origin[];showOrigin:boolean;highlightLine:number|null}){
 const editor=useRef<monaco.editor.IStandaloneCodeEditor|null>(null),decorations=useRef<monaco.editor.IEditorDecorationsCollection|null>(null);
 const environment=useUiEnvironment();
 function decorate(){
  const items:monaco.editor.IModelDeltaDecoration[]=[];
  if(showOrigin)origins.forEach((origin,index)=>{const className=origin==="ai"?styles.originAi:origin==="ai_edited"?styles.originAiEdited:origin==="paste"?styles.originPaste:null;if(className)items.push({range:new monaco.Range(index+1,1,index+1,1),options:{isWholeLine:true,className}});});
  if(highlightLine&&highlightLine<=code.split("\n").length)items.push({range:new monaco.Range(highlightLine,1,highlightLine,1),options:{isWholeLine:true,className:styles.selectedLine}});
  decorations.current?.set(items);
  if(highlightLine){editor.current?.revealLineInCenter(highlightLine);editor.current?.setPosition({lineNumber:highlightLine,column:1});}
 }
 const onMount:OnMount=(instance)=>{editor.current=instance;decorations.current=instance.createDecorationsCollection();decorate();};
 useEffect(()=>{
  const token=(name:string)=>getComputedStyle(document.documentElement).getPropertyValue(`--he-${name}`).trim();
  monaco.editor.defineTheme("hireescape-replay",{base:"vs-dark",inherit:true,rules:[],colors:{"editor.background":token("surface"),"editor.foreground":token("text"),"editorLineNumber.foreground":token("muted"),"editor.selectionBackground":token("surface-2")}});
  monaco.editor.setTheme("hireescape-replay");
 },[environment.theme]);
 useEffect(()=>{decorate();});
 useEffect(()=>()=>{decorations.current?.clear();editor.current=null;},[]);
 return <Editor language="javascript" theme="hireescape-replay" value={code} onMount={onMount} height="440px" loading={<p role="status">Loading bundled read-only editor…</p>} options={{readOnly:true,domReadOnly:true,minimap:{enabled:false},fontFamily:"var(--font-mono), monospace",fontSize:14,automaticLayout:true,scrollBeyondLastLine:false,wordWrap:"on",contextmenu:false,quickSuggestions:false,suggestOnTriggerCharacters:false,wordBasedSuggestions:"off",ariaLabel:"Read-only snapshot code"}}/>;
}

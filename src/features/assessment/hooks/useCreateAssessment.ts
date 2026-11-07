"use client";
import { useRef, useState } from "react";
import { useGenerateChallenge } from "@/features/saboteur";
import type { AssessmentConfig, DefectType } from "@/lib/contracts";
import { ApiError } from "@/lib/api-client";
import { requestAssessmentToken } from "../lib/token";
import { useAssessmentStore } from "../store";
export type CreateAssessmentInput = Omit<AssessmentConfig,"id"|"challengeId"|"createdAt"|"token"> & {defectType:DefectType|"surprise"};
export function useCreateAssessment() {
 const generator=useGenerateChallenge();
 const [state,setState]=useState<{status:"idle"|"loading"|"success"|"error";id:string|null;error:string|null}>({status:"idle",id:null,error:null});
 const pending=useRef<Promise<string>|null>(null);
 function create(input:CreateAssessmentInput):Promise<string> {
  if(pending.current)return pending.current;
  pending.current=(async()=>{
   setState({status:"loading",id:null,error:null});
   try {
    const id=crypto.randomUUID();
    const token=await requestAssessmentToken({assessmentId:id,aiAssistance:input.aiAssistance,durationMin:input.durationMin});
    const {challenge,secret}=await generator.start({level:input.level,defectType:input.defectType});
    await useAssessmentStore.getState().addAssessment({id,challengeId:challenge.id,candidateAlias:input.candidateAlias,level:challenge.level,aiAssistance:input.aiAssistance,durationMin:input.durationMin,proctoring:input.proctoring,locale:input.locale,createdAt:new Date().toISOString(),token},challenge,secret);
    setState({status:"success",id,error:null});return id;
   } catch(error) {
    setState({status:"error",id:null,error:error instanceof ApiError?error.message:"The assessment could not be saved. Retry or use the quick demo."});throw error;
   } finally {pending.current=null;}
  })();return pending.current;
 }
 return {...state,generator,create};
}

import type { LabState,RoomDefinition } from "./types";
import { createInitialState } from "./fs";
import { executeLine } from "./shell";
import { cancelWarmUpAuthentication,completeWarmUp,createWarmUpState,executeWarmUp,type WarmUpState } from "./warm-up";
import { completeTerminal,labCommands } from "./terminal-completion";
import { warmUpSessionAdvice } from "./warm-up-guide";

export function createRoomState(room:RoomDefinition):LabState {
  if(room.environment!=="warm-up")return createInitialState();
  const state=createWarmUpState();
  // SSH is taught in its own module; later modules begin on the already-authenticated training server.
  if(room.slug!=="admin-ssh") {state.connected=true;state.sshVerified=true;state.cwd="/root";state.env={...state.env,HOME:"/root",USER:"root"};}
  return state;
}
export function roomIdentity(room:RoomDefinition,state:LabState) {
  if(room.environment!=="warm-up")return undefined;
  const server=(state as WarmUpState).connected;
  return {user:server ? "root" : "analyst",host:server ? "Cakgup" : "workstation",home:server ? "/root" : "/home/analyst"};
}
export function executeRoomCommand(room:RoomDefinition,state:LabState,line:string) {
  if(room.environment!=="warm-up")return executeLine(state,line);
  return executeWarmUp(state as WarmUpState,line);
}
export function completeRoomCommand(room:RoomDefinition,state:LabState,line:string) {
  return room.environment==="warm-up" ? completeWarmUp(state as WarmUpState,line) : completeTerminal(line,state.fs,state.cwd,"/home/analyst",labCommands);
}
export function cancelRoomInput(room:RoomDefinition,state:LabState) {return room.environment==="warm-up" ? cancelWarmUpAuthentication(state as WarmUpState) : state;}
export function roomSessionAdvice(room:RoomDefinition,state:LabState) {
  if(room.environment!=="warm-up")return undefined;
  return warmUpSessionAdvice(room.slug==="admin-mysql-queries" ? 27 : room.slug==="admin-mysql-access" ? 24 : 0,state as WarmUpState);
}

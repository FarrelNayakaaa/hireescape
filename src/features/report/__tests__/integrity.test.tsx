// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { IntegritySection } from "../components/IntegritySection";
const {getRecord}=vi.hoisted(()=>({getRecord:vi.fn()}));
vi.mock("@/features/proctoring",()=>({getIntegrityRecord:getRecord,IntegrityReport:({sessionId}:{sessionId:string})=><p>Integrity for {sessionId}</p>}));
beforeEach(()=>{getRecord.mockReset();});afterEach(cleanup);
it("renders the optional public component only for a matching record",async()=>{getRecord.mockReturnValue({sessionId:"session-1"});render(<IntegritySection sessionId="session-1" enabled/>);expect(await screen.findByRole("heading",{name:"Integrity signals"})).toBeInTheDocument();expect(screen.getByText("Integrity for session-1")).toBeInTheDocument();});
it("renders nothing when the optional record is unavailable",async()=>{getRecord.mockReturnValue(null);const {container}=render(<IntegritySection sessionId="session-1" enabled/>);await waitFor(()=>expect(getRecord).toHaveBeenCalled());expect(container).toBeEmptyDOMElement();});
it("renders nothing when the optional getter fails",async()=>{getRecord.mockImplementation(()=>{throw new Error("not ready");});const {container}=render(<IntegritySection sessionId="session-1" enabled/>);await waitFor(()=>expect(getRecord).toHaveBeenCalled());expect(container).toBeEmptyDOMElement();});
it("does not read integrity when proctoring was off",()=>{const {container}=render(<IntegritySection sessionId="session-1" enabled={false}/>);expect(getRecord).not.toHaveBeenCalled();expect(container).toBeEmptyDOMElement();});

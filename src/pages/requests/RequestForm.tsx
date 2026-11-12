import type { LoadRevisionPermit } from "../../types";
import { isLoadRevision } from "../../data/initialData";
import { LoadRevisionForm } from "./permit/LoadRevisionForm";
import { GenericRequestForm } from "./GenericRequestForm";

export function RequestForm({ type, cancel, submit }: { type: string; cancel: () => void; submit: (permit?: LoadRevisionPermit) => void }) {
  return isLoadRevision(type) ? <LoadRevisionForm cancel={cancel} submit={submit}/> : <GenericRequestForm type={type} cancel={cancel} submit={() => submit()}/>;
}

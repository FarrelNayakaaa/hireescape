import { Fragment } from "react";

export function ReadableText({ children }: { children: string }) {
  return children.split(/([—…])/).map((part, index) => (
    <Fragment key={index}>{/^[—…]$/.test(part) ? <span className="he-punctuation">{part}</span> : part}</Fragment>
  ));
}

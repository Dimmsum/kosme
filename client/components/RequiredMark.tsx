// Asterisk placed after a form label to mark the field as required, so people
// can see what they must fill in before they submit, not from an error after.
export default function RequiredMark() {
  return (
    <>
      <span aria-hidden="true" className="ml-0.5 text-k-accent">*</span>
      <span className="sr-only"> (required)</span>
    </>
  );
}

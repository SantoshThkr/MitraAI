type ResultsProps = {
  ans: string;
};

const Results = ({ ans }: ResultsProps) => {
  const startsBold = /^\*\*/.test(ans);
  const renderedText = ans.replace(/^\*\*/, "").replace(/\*\*$/, "").trim();

  return (
    <span
      style={{
        fontWeight: startsBold ? "bold" : "normal",
        whiteSpace: "pre-wrap",
      }}
    >
      {renderedText}
    </span>
  );
};

export default Results;

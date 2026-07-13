import { useEffect } from "react";

const Results = ({ ans }) => {
  const checkBoldStart = (str) => {
    return /^\*\*/.test(str);
  };

  useEffect(() => {
    console.log(ans, checkBoldStart(ans));
  }, [ans]);


  const renderText = (str) => {
    if (!str) return "";
    return str.replace(/^\*\*/, "").replace(/\*\*$/, "").trim();
  };

  return (
    <span
      style={{
        fontWeight: checkBoldStart(ans) ? "bold" : "normal",
        whiteSpace: "pre-wrap",
      }}
    >
      {renderText(ans)}
    </span>
  );
};

export default Results;

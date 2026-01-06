import React, { useRef } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const PdfGenerator = ({ pages }) => {
  const containerRef = useRef(null);

  const generatePDF = async () => {
    if (!containerRef.current) return;

    const pdf = new jsPDF("p", "mm", "a4");
    const a4Width = 210;
    const a4Height = 297;

    const pageElements = containerRef.current.children;

    for (let i = 0; i < pageElements.length; i++) {
      const element = pageElements[i];

      // Convert the page into a canvas image
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
      });

      const imgData = canvas.toDataURL("image/png");
      const imgWidth = a4Width;
      const imgHeight = (canvas.height * a4Width) / canvas.width;

      if (i !== 0) pdf.addPage(); // create new page except first

      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
    }

    pdf.save("Proposal.pdf");
  };

  return (
    <div>
      {/* Hidden HTML container used to generate PDF pages */}
      <div
        ref={containerRef}
        style={{
          position: "absolute",
          left: "-9999px",
          top: 0,
          width: "794px", // A4 width in pixels for high quality
        }}
      >
        {pages.map((page, index) => (
          <div
            key={index}
            style={{
              width: "794px",
              minHeight: "1123px",
              background: "white",
            }}
          >
            {page}
          </div>
        ))}
      </div>

      <button
        onClick={generatePDF}
        className="px-4 py-2 bg-purple-600 text-white rounded-lg"
      >
        Download PDF
      </button>
    </div>
  );
};

export default PdfGenerator;

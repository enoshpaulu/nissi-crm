const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// PDF generation endpoint
app.post('/api/generate-pdf', async (req, res) => {
  const { type, data } = req.body;
  
  if (!type || !data) {
    return res.status(400).json({ error: 'Missing type or data' });
  }
  
  const timestamp = Date.now();
  const inputFile = path.join(__dirname, `temp_${timestamp}.json`);
  const outputFile = path.join(__dirname, 'public', `${type}_${timestamp}.pdf`);
  
  try {
    // Write input JSON
    await fs.writeFile(inputFile, JSON.stringify(data));
    
    // Run Python script
    const pythonScript = path.join(__dirname, 'generate_pdf.py');
    const command = `python3 "${pythonScript}" ${type} "${inputFile}" "${outputFile}"`;
    
    exec(command, async (error, stdout, stderr) => {
      // Clean up input file
      try {
        await fs.unlink(inputFile);
      } catch (e) {}
      
      if (error) {
        console.error('PDF generation error:', error);
        console.error('stderr:', stderr);
        return res.status(500).json({ error: 'PDF generation failed', details: stderr });
      }
      
      // Return download URL
      const downloadUrl = `/downloads/${type}_${timestamp}.pdf`;
      res.json({ 
        success: true, 
        url: downloadUrl,
        filename: `${type}_${data[`${type}_number`] || timestamp}.pdf`
      });
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Serve PDF files
app.use('/downloads', express.static(path.join(__dirname, 'public')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`PDF server running on http://localhost:${PORT}`);
});
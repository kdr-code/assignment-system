const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema(
  {
    assignmentId: { type: String, required: true },
    studentId: { type: String, required: true },
    studentName: String,     // Student's name from JWT
    studentEmail: String,    // Student's email from JWT
    fileName: String,        // Original file name
    filePath: String,        // Server path where file is stored
    fileSize: Number,
    fileType: String,
    status: { type: String, default: 'submitted' },
    grade: Number,
    feedback: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Submission', submissionSchema);

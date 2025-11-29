import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';

const API_URL = import.meta.env.VITE_API_URL;

const TeacherDashboard = () => {
  const { user, logout, token } = useAuth();
  const { assignments, submissions, createAssignment, gradeSubmission } = useApp();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignmentsModal, setShowAssignmentsModal] = useState(false);
  const [showGradingModal, setShowGradingModal] = useState(false);
  const [showStudentsModal, setShowStudentsModal] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [grade, setGrade] = useState('');
  const [feedback, setFeedback] = useState('');
  
  // Form state for new assignment
  const [newAssignment, setNewAssignment] = useState({
    title: '',
    description: '',
    dueDate: '',
    maxPoints: '100'
  });

  // Real stats from backend
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalAssignments: 0,
    totalSubmissions: 0,
    pendingGrading: 0,
  });

  // Fetch stats from backend
  useEffect(() => {
    const fetchStats = async () => {
      if (!token) return;
      try {
        const res = await fetch(`${API_URL}/api/stats/teacher`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      }
    };
    fetchStats();
  }, [token, submissions]); // Refetch when submissions change
  
  // Mock assignments
  const mockAssignments = assignments.length > 0 ? assignments : [
    { id: '1', title: 'JavaScript Fundamentals', dueDate: '2025-12-15', status: 'active', submissions: 12 },
    { id: '2', title: 'React Components', dueDate: '2025-12-20', status: 'active', submissions: 8 },
    { id: '3', title: 'API Integration', dueDate: '2025-12-25', status: 'active', submissions: 5 }
  ];
  
  // Mock students
    // Build real student stats from submissions
  const studentsStats = (() => {
    if (!submissions || submissions.length === 0) return [];

    const map = {};

    submissions.forEach((s) => {
      const id =
        s.studentId ||
        s.studentEmail ||
        s.studentName ||
        'unknown';

      if (!map[id]) {
        map[id] = {
          id,
          name: s.studentName || 'Student',
          email: s.studentEmail || '',
          submitted: 0,
          totalGrade: 0,
          gradedCount: 0,
        };
      }

      map[id].submitted += 1;

      if (typeof s.grade === 'number') {
        map[id].totalGrade += s.grade;
        map[id].gradedCount += 1;
      }
    });

    const totalAssignments = assignments.length || 0;

    return Object.values(map).map((st) => {
      const pending = Math.max(totalAssignments - st.submitted, 0);
      const avgGrade =
        st.gradedCount > 0
          ? Math.round(st.totalGrade / st.gradedCount)
          : null;

      return {
        ...st,
        pending,
        avgGrade,
      };
    });
  })();

  
  const handleCreateAssignment = () => {
    if (!newAssignment.title || !newAssignment.dueDate) {
      alert('Please fill in all required fields');
      return;
    }
    
    createAssignment(newAssignment);
    setNewAssignment({ title: '', description: '', dueDate: '', maxPoints: '100' });
    setShowCreateModal(false);
    alert('Assignment created successfully!');
  };
  
  const handleGradeSubmission = () => {
    if (!selectedSubmission) return;
    if (!grade) {
      alert('Please enter a grade');
      return;
    }

    // update submissions via context
    gradeSubmission(selectedSubmission.id, grade, feedback);

    alert(`Grade ${grade}/100 submitted with feedback!`);

    setGrade('');
    setFeedback('');
    setSelectedSubmission(null);
    setShowGradingModal(false);
  };

  // Function to download/view submitted file
  const handleViewFile = async (submissionId) => {
    try {
      const res = await fetch(`${API_URL}/api/submissions/${submissionId}/file`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) {
        alert('Failed to download file');
        return;
      }
      
      // Get filename from Content-Disposition header or use default
      const contentDisposition = res.headers.get('Content-Disposition');
      let filename = 'download';
      if (contentDisposition) {
        const matches = /filename="(.+)"/.exec(contentDisposition);
        if (matches) filename = matches[1];
      }
      
      // Download file
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download file');
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Teacher Dashboard</h1>
          <p style={{ color: '#333333', fontSize: '1rem' }}>Welcome back, {user?.name}!</p>
        </div>
        <button onClick={logout} className="btn-secondary">
          Logout
        </button>
      </div>

      {/* Quick Stats */}
      <div className="stats-cards">
        <div className="stat-card stat-card--primary">
          <div className="stat-card__icon">📚</div>
          <div className="stat-card__content">
            <div className="stat-card__value">{stats.totalAssignments}</div>
            <div className="stat-card__label">Total Assignments</div>
          </div>
        </div>
        <div className="stat-card stat-card--success">
          <div className="stat-card__icon">👥</div>
          <div className="stat-card__content">
            <div className="stat-card__value">{stats.totalStudents}</div>
            <div className="stat-card__label">Students</div>
          </div>
        </div>
        <div className="stat-card stat-card--warning">
          <div className="stat-card__icon">📋</div>
          <div className="stat-card__content">
            <div className="stat-card__value">{stats.totalSubmissions}</div>
            <div className="stat-card__label">Submissions</div>
          </div>
        </div>
        <div className="stat-card stat-card--error">
          <div className="stat-card__icon">⏰</div>
          <div className="stat-card__content">
            <div className="stat-card__value">{stats.pendingGrading}</div>
            <div className="stat-card__label">Pending Grading</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="section-header">
        <h2>Quick Actions</h2>
      </div>
      <div className="action-cards">
        <div className="action-card">
          <div className="action-card__icon action-card__icon--primary">📝</div>
          <div className="action-card__content">
            <h3>Create Assignment</h3>
            <p>Create new assignments for your students</p>
          </div>
          <button 
            className="btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            New Assignment
          </button>
        </div>
        
        <div className="action-card">
          <div className="action-card__icon action-card__icon--success">📊</div>
          <div className="action-card__content">
            <h3>Grade Submissions</h3>
            <p>Review and grade student submissions</p>
          </div>
          <button 
            className="btn-secondary"
            onClick={() => setShowGradingModal(true)}
          >
            View Submissions
          </button>
        </div>
        
        <div className="action-card">
          <div className="action-card__icon action-card__icon--warning">👥</div>
          <div className="action-card__content">
            <h3>Manage Students</h3>
            <p>View student progress and performance</p>
          </div>
          <button 
            className="btn-secondary"
            onClick={() => setShowStudentsModal(true)}
          >
            View Students
          </button>
        </div>
      </div>

      {/* Recent Submissions */}
      {submissions.length > 0 && (
        <div className="submissions-section">
          <div className="section-header">
            <h2>Recent Submissions</h2>
            <button 
              className="btn-secondary btn-sm"
              onClick={() => setShowGradingModal(true)}
            >
              View All
            </button>
          </div>
          <div className="submissions-list">
            {submissions.slice(0, 5).map((submission) => (
              <div key={submission.id} className="submission-item">
                <div className="submission-item__icon">📄</div>
                <div className="submission-item__content">
                  <h4>{submission.studentName || 'Student'}</h4>
                  <p className="text-sm text-secondary">
  {submission.fileName} •{' '}
  {new Date(submission.submittedAt || submission.createdAt || Date.now())
    .toLocaleDateString()}
</p>

                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    className="btn-secondary btn-sm"
                    onClick={() => handleViewFile(submission.id)}
                  >
                    📄 View File
                  </button>
                  <button 
                    className="btn-primary btn-sm"
                    onClick={() => {
                      setSelectedSubmission(submission);
                      setShowGradingModal(true);
                    }}
                  >
                    Grade
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Assignment Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Assignment</h2>
              <button 
                className="modal-close"
                onClick={() => setShowCreateModal(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="title">Assignment Title *</label>
                <input
                  type="text"
                  id="title"
                  value={newAssignment.title}
                  onChange={(e) => setNewAssignment({...newAssignment, title: e.target.value})}
                  placeholder="Enter assignment title"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  value={newAssignment.description}
                  onChange={(e) => setNewAssignment({...newAssignment, description: e.target.value})}
                  rows="4"
                  placeholder="Enter assignment description"
                  className="form-input form-textarea"
                />
              </div>

              <div className="form-group">
                <label htmlFor="dueDate">Due Date *</label>
                <input
                  type="date"
                  id="dueDate"
                  value={newAssignment.dueDate}
                  onChange={(e) => setNewAssignment({...newAssignment, dueDate: e.target.value})}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="maxPoints">Maximum Points</label>
                <input
                  type="number"
                  id="maxPoints"
                  value={newAssignment.maxPoints}
                  onChange={(e) => setNewAssignment({...newAssignment, maxPoints: e.target.value})}
                  placeholder="100"
                  className="form-input"
                />
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn-secondary"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn-primary"
                onClick={handleCreateAssignment}
              >
                Create Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grading Modal */}
      {showGradingModal && (
        <div className="modal-overlay" onClick={() => setShowGradingModal(false)}>
          <div className="modal-content" style={{maxWidth: '700px'}} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Grade Submissions</h2>
              <button 
                className="modal-close"
                onClick={() => setShowGradingModal(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              {selectedSubmission ? (
                <>
                  <div className="submission-detail">
                    <h3>Student: {selectedSubmission.studentName}</h3>
                    <p><strong>File:</strong> {selectedSubmission.fileName}</p>
                    <p><strong>Submitted:</strong> {new Date(selectedSubmission.submittedAt || selectedSubmission.createdAt).toLocaleDateString()}</p>
                    <button 
                      className="btn-secondary"
                      onClick={() => handleViewFile(selectedSubmission.id)}
                      style={{ marginTop: '12px' }}
                    >
                      📄 View/Download File
                    </button>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="grade">Grade (out of 100) *</label>
                    <input
                      type="number"
                      id="grade"
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      placeholder="85"
                      min="0"
                      max="100"
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="feedback">Feedback</label>
                    <textarea
                      id="feedback"
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      rows="5"
                      placeholder="Provide feedback to the student..."
                      className="form-input form-textarea"
                    />
                  </div>
                </>
              ) : (
                <div className="submissions-list">
                  {submissions.length > 0 ? (
                    submissions.map((submission) => (
                      <div key={submission.id} className="submission-item">
                        <div className="submission-item__icon">📄</div>
                        <div className="submission-item__content">
                          <h4>{submission.studentName || 'Student'}</h4>
                          <p className="text-sm">
                            {submission.fileName} • {new Date(submission.submittedAt || submission.createdAt).toLocaleDateString()}
                            {submission.grade && ` • Grade: ${submission.grade}/100`}
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            className="btn-secondary btn-sm"
                            onClick={() => handleViewFile(submission.id)}
                          >
                            📄 View
                          </button>
                          <button 
                            className="btn-primary btn-sm"
                            onClick={() => setSelectedSubmission(submission)}
                          >
                            Grade
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">
                      <p>No submissions yet</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer">
              {selectedSubmission ? (
                <>
                  <button 
                    className="btn-secondary"
                    onClick={() => setSelectedSubmission(null)}
                  >
                    Back
                  </button>
                  <button 
                    className="btn-primary"
                    onClick={handleGradeSubmission}
                  >
                    Submit Grade
                  </button>
                </>
              ) : (
                <button 
                  className="btn-secondary"
                  onClick={() => setShowGradingModal(false)}
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Students Modal */}
      {showStudentsModal && (
        <div className="modal-overlay" onClick={() => setShowStudentsModal(false)}>
          <div className="modal-content" style={{maxWidth: '800px'}} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Manage Students</h2>
              <button 
                className="modal-close"
                onClick={() => setShowStudentsModal(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="students-table">
                <table style={{width: '100%', borderCollapse: 'collapse'}}>
                  <thead>
                    <tr style={{borderBottom: '2px solid #e2e8f0'}}>
                      <th style={{padding: '12px', textAlign: 'left', color: '#1a202c'}}>Student Name</th>
                      <th style={{padding: '12px', textAlign: 'left', color: '#1a202c'}}>Email</th>
                      <th style={{padding: '12px', textAlign: 'center', color: '#1a202c'}}>Submitted</th>
                      <th style={{padding: '12px', textAlign: 'center', color: '#1a202c'}}>Pending</th>
                      <th style={{padding: '12px', textAlign: 'center', color: '#1a202c'}}>Grade</th>
                    </tr>
                  </thead>
                  <tbody>
  {studentsStats.length === 0 ? (
    <tr>
      <td
        colSpan="5"
        style={{ padding: '16px', textAlign: 'center', color: '#4a5568' }}
      >
        No student submissions yet
      </td>
    </tr>
  ) : (
    studentsStats.map((student) => (
      <tr key={student.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
        <td style={{ padding: '12px', color: '#000' }}>
          <strong>{student.name}</strong>
        </td>
        <td style={{ padding: '12px', color: '#000' }}>
          {student.email || '—'}
        </td>
        <td
          style={{
            padding: '12px',
            textAlign: 'center',
            color: '#000',
          }}
        >
          <span className="status-badge status-badge--submitted">
            {student.submitted}
          </span>
        </td>
        <td
          style={{
            padding: '12px',
            textAlign: 'center',
            color: '#000',
          }}
        >
          <span className="status-badge status-badge--pending">
            {student.pending}
          </span>
        </td>
        <td
          style={{
            padding: '12px',
            textAlign: 'center',
            color: '#000',
          }}
        >
          <strong style={{ color: '#22c55e' }}>
            {student.avgGrade != null ? `${student.avgGrade}` : '—'}
          </strong>
        </td>
      </tr>
    ))
  )}
</tbody>

                </table>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn-secondary"
                onClick={() => setShowStudentsModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assignments Modal */}
      {showAssignmentsModal && (
        <div className="modal-overlay" onClick={() => setShowAssignmentsModal(false)}>
          <div className="modal-content" style={{maxWidth: '700px'}} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>View All Assignments</h2>
              <button 
                className="modal-close"
                onClick={() => setShowAssignmentsModal(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="assignments-list">
                {mockAssignments.map((assignment) => (
                  <div key={assignment.id} className="assignment-item">
                    <div className="assignment-item__content">
                      <h3>{assignment.title}</h3>
                      <div className="assignment-item__meta">
                        <span>📅 Due: {assignment.dueDate}</span>
                        <span>📤 {assignment.submissions} submissions</span>
                      </div>
                    </div>
                    <button className="btn-secondary btn-sm">
                      Edit
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn-secondary"
                onClick={() => setShowAssignmentsModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;

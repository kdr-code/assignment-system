import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useAuth } from './AuthContext';

const AppContext = createContext();
const API_URL = import.meta.env.VITE_API_URL;

const initialState = {
  assignments: [],
  submissions: [],
  loading: false,
  error: null,
};

const appReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_ASSIGNMENTS':
      return { ...state, assignments: action.payload, loading: false };
    case 'ADD_ASSIGNMENT':
      return { ...state, assignments: [...state.assignments, action.payload] };
    case 'SET_SUBMISSIONS':
      return { ...state, submissions: action.payload, loading: false };
    case 'ADD_SUBMISSION':
      return { ...state, submissions: [...state.submissions, action.payload] };
    case 'UPDATE_SUBMISSION':
      return {
        ...state,
        submissions: state.submissions.map((s) =>
          s.id === action.payload.id ? { ...s, ...action.payload } : s
        ),
      };
    default:
      return state;
  }
};

const normalizeAssignment = (a) => ({
  ...a,
  id: a.id || a._id,
});

const normalizeSubmission = (s) => ({
  ...s,
  id: s.id || s._id,
});

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { user, token } = useAuth();

  const setLoading = (value) =>
    dispatch({ type: 'SET_LOADING', payload: value });
  const setError = (msg) =>
    dispatch({ type: 'SET_ERROR', payload: msg });

  // Load assignments from backend
  const loadAssignments = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/assignments`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      let data = [];
      try {
        data = await res.json();
      } catch {
        data = [];
      }

      if (!res.ok) {
        setError(data.error || 'Failed to load assignments');
        return;
      }

      const normalized = data.map(normalizeAssignment);
      dispatch({ type: 'SET_ASSIGNMENTS', payload: normalized });
    } catch (err) {
      console.error(err);
      setError('Failed to load assignments');
    }
  };

  // Load submissions from backend
  const loadSubmissions = async () => {
    if (!token || !user) return;
    setLoading(true);
    setError(null);

    try {
      const endpoint =
        user.role === 'teacher'
          ? `${API_URL}/api/submissions`
          : `${API_URL}/api/submissions/mine`;

      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      let data = [];
      try {
        data = await res.json();
      } catch {
        data = [];
      }

      if (!res.ok) {
        setError(data.error || 'Failed to load submissions');
        return;
      }

      const normalized = data.map(normalizeSubmission);
      dispatch({ type: 'SET_SUBMISSIONS', payload: normalized });
    } catch (err) {
      console.error(err);
      setError('Failed to load submissions');
    }
  };

  // Teacher creates assignment
  const createAssignment = async (assignment) => {
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/assignments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(assignment),
      });

      let data = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok) {
        setError(data.error || 'Failed to create assignment');
        return;
      }

      const normalized = normalizeAssignment(data);
      dispatch({ type: 'ADD_ASSIGNMENT', payload: normalized });
    } catch (err) {
      console.error(err);
      setError('Failed to create assignment');
    }
  };

  // Student submits assignment - Now sends actual file via FormData
  const submitAssignment = async (submission) => {
    if (!token) {
      setError('You must be logged in to submit.');
      return null;
    }

    try {
      // Create FormData with file and assignment ID
      const formData = new FormData();
      formData.append('assignmentId', submission.assignmentId);
      formData.append('file', submission.file); // The actual File object

      const res = await fetch(`${API_URL}/api/submissions`, {
        method: 'POST',
        headers: {
          // Don't set Content-Type - browser will set it with boundary for multipart/form-data
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      let data = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok) {
        console.error('Submit failed from backend:', res.status, data);
        setError(data.error || `Failed to submit assignment (status ${res.status})`);
        alert(data.error || 'Failed to submit assignment. Check backend.');
        return null;
      }

      const normalized = normalizeSubmission(data);
      dispatch({ type: 'ADD_SUBMISSION', payload: normalized });
      return normalized;
    } catch (err) {
      console.error('Submit error:', err);
      setError('Failed to submit assignment (network error)');
      alert('Network error while submitting. Is backend running?');
      return null;
    }
  };

  // Teacher grades a submission
  const gradeSubmission = async (submissionId, grade, feedback) => {
    if (!token) return;

    try {
      const res = await fetch(
        `${API_URL}/api/submissions/${submissionId}/grade`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ grade, feedback }),
        }
      );

      let data = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok) {
        setError(data.error || 'Failed to grade submission');
        return;
      }

      const normalized = normalizeSubmission(data);
      dispatch({ type: 'UPDATE_SUBMISSION', payload: normalized });
    } catch (err) {
      console.error(err);
      setError('Failed to grade submission');
    }
  };

  // Auto-load when user/token changes
  useEffect(() => {
  if (token && user) {
    loadAssignments();
    loadSubmissions();
  } else {
    dispatch({ type: 'SET_ASSIGNMENTS', payload: [] });
    dispatch({ type: 'SET_SUBMISSIONS', payload: [] });  // <-- THIS CLEARS OLD DATA
  }
}, [token, user]);



  const value = {
    ...state,
    loadAssignments,
    loadSubmissions,
    createAssignment,
    submitAssignment,
    gradeSubmission,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};

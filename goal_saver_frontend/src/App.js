import React, { useState, useEffect } from "react";
import "./App.css";

// PUBLIC_INTERFACE
function useGoalAPI() {
  /**
   * Mocked API hooks for goal and user management.
   */
  const [goals, setGoals] = useState(() => [
    // Example initial data
    {
      id: 1,
      name: "Buy Headphones",
      target: 3000,
      saved: 1200,
      deadline: "2024-08-18",
      remindersEnabled: true,
      milestoneMessages: [
        { pct: 25, msg: "Nice! You're a quarter way there." },
        { pct: 50, msg: "Halfway to your goal!" },
        { pct: 100, msg: "Goal achieved! 🎉" }
      ]
    },
    {
      id: 2,
      name: "Trip Fund",
      target: 8000,
      saved: 3250,
      deadline: "2024-10-01",
      remindersEnabled: false,
      milestoneMessages: [
        { pct: 50, msg: "Halfway to your new memories!" },
        { pct: 100, msg: "Fund complete! Time to go." }
      ]
    }
  ]);

  const [preferences, setPreferences] = useState({
    reminderFrequency: "Weekly", // Daily / Weekly / Off
    notificationEnabled: true
  });

  // CRUD operations

  // PUBLIC_INTERFACE
  const createGoal = (goal) => {
    setGoals((prev) => [
      ...prev,
      {
        ...goal,
        id: Math.max(0, ...prev.map((g) => g.id)) + 1,
        saved: 0,
        remindersEnabled: !!goal.remindersEnabled,
        milestoneMessages: goal.milestoneMessages ?? []
      }
    ]);
  };

  // PUBLIC_INTERFACE
  const updateGoal = (id, updates) => {
    setGoals((prev) =>
      prev.map((goal) => (goal.id === id ? { ...goal, ...updates } : goal))
    );
  };

  // PUBLIC_INTERFACE
  const deleteGoal = (id) => {
    setGoals((prev) => prev.filter((goal) => goal.id !== id));
  };

  // PUBLIC_INTERFACE
  const addContribution = (id, amount) => {
    setGoals((prev) =>
      prev.map((goal) =>
        goal.id === id
          ? { ...goal, saved: Math.min(goal.target, goal.saved + amount) }
          : goal
      )
    );
  };

  // PUBLIC_INTERFACE
  const setUserPreferences = (updates) => {
    setPreferences((prev) => ({ ...prev, ...updates }));
  };

  // PUBLIC_INTERFACE
  const resetAll = () => {
    setGoals([]);
  };

  return {
    goals,
    createGoal,
    updateGoal,
    deleteGoal,
    addContribution,
    preferences,
    setUserPreferences,
    resetAll
  };
}

// PUBLIC_INTERFACE
function useReminderNotifications(goals, preferences) {
  /**
   * Returns reminders due for display in this session
   */
  const [reminders, setReminders] = useState([]);

  useEffect(() => {
    // Simple logic for demo, not actual scheduling
    if (!preferences.notificationEnabled) {
      setReminders([]);
      return;
    }
    const now = new Date();
    const dueReminders = goals
      .filter((g) => g.remindersEnabled)
      .map((goal) => {
        // Check milestone for motivational message
        const pct = Math.floor((goal.saved / goal.target) * 100);
        const upcomingMilestone = goal.milestoneMessages?.find(
          (m) => pct < m.pct
        );
        return {
          goalId: goal.id,
          goalName: goal.name,
          msg: !upcomingMilestone
            ? ""
            : `Milestone: ${upcomingMilestone.msg}`,
          reminder: `Keep saving for "${goal.name}"!`
        };
      });
    setReminders(dueReminders.filter((r) => r.msg || r.reminder));
  }, [goals, preferences]);
  return reminders;
}

/**
 * SmartPlanningPanel (AI-Powered Smart Planning)
 * Allows user to enter income, expenses, lifestyle info.
 * Uses local heuristics to suggest an adaptive savings plan and categorizes expenses.
 * NOTE: In a real app, AI/ML API call would be made here for richer personalization.
 */
function SmartPlanningPanel({ goals, colors = COLORS }) {
  const [income, setIncome] = useState("");
  const [expenses, setExpenses] = useState([{ category: "Rent", value: "" }]);
  const [lifestyle, setLifestyle] = useState("Frugal");
  const [urgency, setUrgency] = useState("Normal");
  const [suggestion, setSuggestion] = useState(null);

  // For available categories and lifestyles, can be extended
  const expenseCategories = [
    "Rent/Housing", "Food & Groceries", "Transport", "Utilities", "Shopping", "Entertainment", "Health", "Other"
  ];
  const lifestyleOptions = [
    { label: "Frugal", multiplier: 0.15 },
    { label: "Balanced", multiplier: 0.12 },
    { label: "Comfort", multiplier: 0.08 }
  ];
  const urgencyLevels = [
    { label: "Very High", multiplier: 1.20 },
    { label: "High", multiplier: 1.10 },
    { label: "Normal", multiplier: 1.0 },
    { label: "Low", multiplier: 0.8 }
  ];

  function handleExpenseChange(idx, field, value) {
    setExpenses((prev) => prev.map((e, i) =>
      i === idx ? { ...e, [field]: value } : e
    ));
  }

  function addExpenseRow() {
    setExpenses((prev) => [...prev, { category: "", value: "" }]);
  }

  function removeExpenseRow(idx) {
    setExpenses((prev) => prev.filter((_, i) => i !== idx));
  }

  // PUBLIC_INTERFACE
  function handlePlanSuggestion(e) {
    e.preventDefault();
    // Calculate total expenses
    const totalExpenses = expenses.reduce((sum, curr) => {
      const val = parseFloat(curr.value);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);

    const inc = parseFloat(income);
    if (isNaN(inc) || inc <= 0) {
      setSuggestion({ error: "Please enter a valid income amount." });
      return;
    }
    // Select lifestyle & urgency multipliers
    const lifestyleObj = lifestyleOptions.find(l => l.label === lifestyle) || lifestyleOptions[0];
    const urgencyObj = urgencyLevels.find(u => u.label === urgency) || urgencyLevels[2];
    // Local "AI" logic: use multipliers and urgency to suggest savings percent of free income after expenses
    const saveBase = Math.max(0, inc - totalExpenses);
    let proposedSaving = Math.round(saveBase * lifestyleObj.multiplier * urgencyObj.multiplier);
    if (proposedSaving < 0) proposedSaving = 0;

    // Categorize spending for feedback
    const biggest = expenses
      .map((e) => ({ ...e, value: parseFloat(e.value) || 0 }))
      .filter(e => e.category)
      .sort((a, b) => b.value - a.value)[0];

    let notes = [];
    if (biggest && biggest.value > 0) {
      notes.push(`Your largest spending is for "${biggest.category}" (₹${biggest.value}). Consider ways to reduce it if possible.`);
    }
    if (saveBase <= 0) {
      notes.push("Your total expenses meet or exceed your income. Try to optimize your spending.");
    }
    if (proposedSaving === 0) {
      notes.push("Little or no savings are possible with the current inputs — review expenses.");
    }

    // Goal urgency suggestion
    let urgentGoal = null;
    if (goals && goals.length > 0) {
      const now = new Date();
      urgentGoal = goals
        .map(g => ({
          ...g,
          deadlineObj: g.deadline ? new Date(g.deadline) : null
        }))
        .filter(g => g.deadlineObj)
        .sort((a, b) => a.deadlineObj - b.deadlineObj)[0];
    }

    setSuggestion({
      income: inc,
      totalExpenses,
      saveBase,
      proposedSaving,
      notes,
      urgentGoal,
      lifestyle: lifestyleObj.label,
      urgency: urgencyObj.label
    });
    // NOTE: In production, this is where an API call for AI-powered recommendation would occur.
    // Example:
    // fetch('/api/ai-smart-planner', {method:"POST",body:JSON.stringify({ income, expenses, lifestyle, urgency, goals })})
    //   .then(resp => resp.json()).then(setSuggestion);
  }

  return (
    <div
      style={{
        margin: "38px 0 24px",
        background: colors.card,
        borderRadius: 13,
        padding: "22px 27px 21px",
        boxShadow: "0 2px 17px 0 #dbe8ff36",
        maxWidth: 600,
      }}>
      <div style={{ fontWeight: 700, color: colors.primary, marginBottom: 5, fontSize: 20 }}>
        🧠 AI-Powered Smart Planning
      </div>
      <div style={{ color: "#4a556b", fontSize: 15, marginBottom: 13, lineHeight: 1.4 }}>
        Get a custom savings plan suggestion based on your finances and lifestyle.
        <span style={{ color: "#787f97" }}><br />(No data leaves your device. Real AI can be connected in production.)</span>
      </div>
      <form onSubmit={handlePlanSuggestion}>
        <div style={{ marginBottom: 9 }}>
          <label style={{ fontWeight: 500 }}>
            Monthly Income (₹):{" "}
            <input
              type="number"
              value={income}
              min={0}
              placeholder="e.g., 15000"
              onChange={e => setIncome(e.target.value)}
              style={{ width: 110, marginLeft: 5, fontSize: 15 }}
              required
            />
          </label>
        </div>
        <div style={{ marginBottom: 10 }}>
          Expenses:
          {expenses.map((exp, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "center", marginBottom: 3 }}>
              <select
                value={exp.category}
                onChange={e => handleExpenseChange(idx, "category", e.target.value)}
                style={{ fontSize: 15, marginRight: 7 }}>
                <option value="">Select Category</option>
                {expenseCategories.map(cat =>
                  <option value={cat} key={cat}>{cat}</option>
                )}
              </select>
              <input
                type="number"
                value={exp.value}
                min={0}
                placeholder="₹"
                onChange={e => handleExpenseChange(idx, "value", e.target.value)}
                style={{ width: 80, marginLeft: 3, fontSize: 15 }}
                required
              />
              <button type="button" onClick={() => removeExpenseRow(idx)}
                style={{
                  marginLeft: 4, background: "#eee", color: "#555", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700
                }}
                disabled={expenses.length <= 1}
                title="Remove expense"
              >−</button>
            </div>
          ))}
          <button type="button" onClick={addExpenseRow}
            style={{
              fontSize: 14, background: colors.secondary, color: "#633c00", border: "none",
              marginTop: 2, borderRadius: 8, padding: "1.5px 9px", marginLeft: 2, fontWeight: 500
            }}
          >+ Add Expense</button>
        </div>
        <div style={{ margin: "7px 0", display: "flex", gap: 25 }}>
          <label style={{ fontWeight: 500 }}>
            Lifestyle:{" "}
            <select
              value={lifestyle}
              onChange={e => setLifestyle(e.target.value)}
              style={{ fontSize: 15, marginLeft: 3 }}
            >
              {lifestyleOptions.map(opt =>
                <option key={opt.label} value={opt.label}>{opt.label}</option>
              )}
            </select>
          </label>
          <label style={{ fontWeight: 500 }}>
            Goals Urgency:{" "}
            <select
              value={urgency}
              onChange={e => setUrgency(e.target.value)}
              style={{ fontSize: 15, marginLeft: 3 }}
            >
              {urgencyLevels.map(opt =>
                <option key={opt.label} value={opt.label}>{opt.label}</option>
              )}
            </select>
          </label>
        </div>
        <button type="submit" className="btn" style={{
          background: colors.primary, color: "#fff", fontWeight: 600, marginTop: 14, fontSize: 16
        }}>Get Plan Suggestion</button>
      </form>
      {suggestion && (
        <div style={{
          marginTop: 20,
          background: "#e6f6ec",
          borderRadius: 10,
          padding: "12px 16px",
          color: "#184d30",
          fontSize: 15,
          boxShadow: "0 1px 9px 0 #f4fff3a6"
        }}>
          {suggestion.error ?
            <span style={{ color: "#d23535" }}>{suggestion.error}</span>
            : (
              <div>
                <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 17 }}>
                  {`Suggested monthly savings: ₹${suggestion.proposedSaving}`}
                  <span style={{ color: "#295bb1", fontWeight: 600, fontSize: 15, marginLeft: 7 }}>
                    ({suggestion.lifestyle}, Goal Urgency: {suggestion.urgency})
                  </span>
                </div>
                <div>
                  {suggestion.saveBase <= 0
                    ? <span>Your income is fully or over-spent on expenses.</span>
                    : (
                      <span>
                        You can save about <b>{Math.round((suggestion.proposedSaving / Math.max(1, suggestion.income)) * 100)}%</b> of your income monthly.
                        {/* If goals are present, mention the most urgent goal */}
                        {suggestion.urgentGoal &&
                          <span> Your most urgent goal: <b>{suggestion.urgentGoal.name}</b> (Deadline: {suggestion.urgentGoal.deadline})</span>
                        }
                      </span>
                    )}
                </div>
                {suggestion.notes && suggestion.notes.length > 0 &&
                  <ul style={{ marginTop: 6, color: "#25554e" }}>
                    {suggestion.notes.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                }
                <div style={{ marginTop: 4, color: "#87898f", fontSize: 13 }}>
                  <span>
                    {/* Annotation about real AI integration */}
                    <i>{`(In real use, this step can call an AI/ML service/api for deeper analysis and smart suggestions per user profile.)`}</i>
                  </span>
                </div>
              </div>
            )}
        </div>
      )}
    </div>
  );
}

// MAIN CONTAINER

const COLORS = {
  primary: "#4CAF50",
  secondary: "#FFC107",
  accent: "#2196F3",
  bg: "#fafbfc",
  card: "#fff",
  text: "#232323",
  light: "#f6f8fa"
};

// PUBLIC_INTERFACE
function GoalSaverDashboard() {
  // Core hooks
  const {
    goals,
    createGoal,
    updateGoal,
    deleteGoal,
    addContribution,
    preferences,
    setUserPreferences,
    resetAll
  } = useGoalAPI();

  const reminders = useReminderNotifications(goals, preferences);

  // Modals state
  const [showAddGoal, setShowAddGoal] = useState(false);

  const [selectedGoal, setSelectedGoal] = useState(null);
  const [showContributionCalc, setShowContributionCalc] = useState(false);

  // PUBLIC_INTERFACE
  function handleOpenContributionCalc(goal) {
    setSelectedGoal(goal);
    setShowContributionCalc(true);
  }

  // PUBLIC_INTERFACE
  function handleAddContribution(amount) {
    if (selectedGoal && amount > 0) {
      addContribution(selectedGoal.id, amount);
      setShowContributionCalc(false);
    }
  }

  // PUBLIC_INTERFACE
  function handleUpdateGoal(id, updates) {
    updateGoal(id, updates);
  }

  // PUBLIC_INTERFACE
  function handleDeleteGoal(id) {
    if (window.confirm("Delete this goal?")) {
      deleteGoal(id);
    }
  }

  // PUBLIC_INTERFACE
  function handleMilestoneReached(goal) {
    // Placeholder for toast/notification
    window.alert(`Congratulations! "${goal.name}" goal is complete!`);
  }

  // PUBLIC_INTERFACE
  function handlePreferencesUpdate(updates) {
    setUserPreferences(updates);
  }

  // Progress milestone tracking check
  useEffect(() => {
    goals.forEach((goal) => {
      if (goal.saved >= goal.target) {
        handleMilestoneReached(goal);
      }
    });
    // eslint-disable-next-line
  }, [goals]);

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh" }}>
      <Navbar />
      <div style={{ maxWidth: 1050, margin: "auto", padding: "32px 0 48px" }}>
        <SmartPlanningPanel goals={goals} colors={COLORS} />
        <h2
          style={{
            color: COLORS.primary,
            margin: "16px 0 12px",
            fontWeight: 700,
            letterSpacing: 0.3
          }}
        >
          My Savings Goals
        </h2>
        <div style={{ marginBottom: 8 }}>
          <button
            className="btn"
            style={{
              background: COLORS.accent,
              color: "#fff",
              marginRight: 15,
              marginBottom: 12
            }}
            onClick={() => setShowAddGoal(true)}
          >
            + New Goal
          </button>
          <button
            className="btn"
            style={{
              background: "#eee",
              color: COLORS.text,
              border: `1px solid ${COLORS.primary}`
            }}
            onClick={resetAll}
          >
            Reset All
          </button>
        </div>
        <DashboardGrid>
          {goals.length === 0 ? (
            <div
              style={{
                padding: 48,
                textAlign: "center",
                color: "#aaa",
                fontSize: "1.1rem"
              }}
            >
              No goals yet. Start by adding your first savings goal!
            </div>
          ) : (
            goals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onEdit={handleUpdateGoal}
                onDelete={handleDeleteGoal}
                onOpenContributionCalc={handleOpenContributionCalc}
                colors={COLORS}
              />
            ))
          )}
        </DashboardGrid>
        <UserPreferencesPanel
          preferences={preferences}
          onUpdate={handlePreferencesUpdate}
          colors={COLORS}
        />

        <RemindersPanel reminders={reminders} colors={COLORS} />

        {showAddGoal && (
          <AddGoalModal
            onClose={() => setShowAddGoal(false)}
            onCreateGoal={createGoal}
            colors={COLORS}
          />
        )}

        {showContributionCalc && selectedGoal && (
          <ContributionCalcModal
            goal={selectedGoal}
            onClose={() => setShowContributionCalc(false)}
            onAddContribution={handleAddContribution}
            colors={COLORS}
          />
        )}
      </div>

      <div style={{ textAlign: "center", color: "#bbb", padding: 32 }}>
        <span style={{ fontSize: 13 }}>
          GoalSaver is a virtual piggy bank. <b>No bank or UPI link required.</b>
        </span>
      </div>
    </div>
  );
}

// === COMPONENTS ===

function Navbar() {
  return (
    <nav
      style={{
        background: "#fff",
        borderBottom: "1px solid #e6e8ec",
        padding: "0 0",
        height: 62,
        display: "flex",
        alignItems: "center",
        marginBottom: 16,
        boxShadow: "0 1px 6px 0 #f6f6f6"
      }}
    >
      <div
        style={{
          maxWidth: 1050,
          width: "100%",
          margin: "auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "100%"
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: 22,
            color: "#232323",
            display: "flex",
            alignItems: "center"
          }}
        >
          <span
            style={{
              fontSize: 28,
              color: COLORS.primary,
              marginRight: 10,
              fontWeight: 700
            }}
          >
            🏆
          </span>
          GoalSaver
        </div>
        <div
          style={{
            fontSize: 14,
            color: COLORS.primary,
            fontWeight: 600
          }}
        >
          Simple Goal-Based Savings for Students
        </div>
      </div>
    </nav>
  );
}

// Simple flex grid
function DashboardGrid({ children }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 32,
        flexWrap: "wrap",
        margin: "18px 0 32px"
      }}
    >
      {children}
    </div>
  );
}

// Goal Card component
function GoalCard({
  goal,
  onEdit,
  onDelete,
  onOpenContributionCalc,
  colors = COLORS
}) {
  // State for edit
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState({
    name: goal.name,
    target: goal.target,
    deadline: goal.deadline,
    remindersEnabled: goal.remindersEnabled
  });

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setDraft((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  }

  function handleEditSave() {
    if (!draft.name || Number(draft.target) <= 0) return;
    onEdit(goal.id, {
      name: draft.name,
      target: Number(draft.target),
      deadline: draft.deadline,
      remindersEnabled: draft.remindersEnabled
    });
    setEditMode(false);
  }

  const percent = Math.min(
    100,
    Math.floor((goal.saved / goal.target) * 100) || 0
  );
  const isComplete = percent >= 100;

  return (
    <div
      style={{
        background: colors.card,
        borderRadius: 12,
        boxShadow: "0 2px 8px 0 #ececec",
        minWidth: 290,
        maxWidth: 315,
        flex: 1,
        marginBottom: 8,
        padding: "26px 21px 22px 21px",
        position: "relative",
        border: isComplete
          ? `2.5px solid ${colors.primary}`
          : "1.5px solid #eeeeee",
        opacity: isComplete ? 0.93 : 1
      }}
    >
      {isComplete && (
        <div
          style={{
            position: "absolute",
            top: 10,
            right: 18,
            color: colors.primary,
            fontWeight: 700
          }}
        >
          ✔ Goal Reached!
        </div>
      )}
      {editMode ? (
        <div>
          <input
            name="name"
            value={draft.name}
            onChange={handleChange}
            placeholder="Goal Name"
            maxLength={24}
            style={{
              width: "100%",
              fontWeight: 600,
              fontSize: 19,
              marginBottom: 16
            }}
          />
          <input
            name="target"
            value={draft.target}
            type="number"
            onChange={handleChange}
            min={1}
            placeholder="Target Amount"
            style={{
              width: "44%",
              marginRight: 12,
              padding: "3px 0"
            }}
          />
          <input
            name="deadline"
            value={draft.deadline}
            type="date"
            onChange={handleChange}
            style={{
              width: "48%",
              padding: "3px 0"
            }}
          />
          <div style={{ margin: "10px 0 6px" }}>
            <label>
              <input
                name="remindersEnabled"
                type="checkbox"
                checked={draft.remindersEnabled}
                onChange={handleChange}
              />{" "}
              Enable Reminders
            </label>
          </div>
          <button
            className="btn"
            onClick={handleEditSave}
            style={{
              background: colors.primary,
              color: "#fff",
              marginRight: 10
            }}
          >
            Save
          </button>
          <button
            className="btn"
            onClick={() => setEditMode(false)}
            style={{ background: "#f7f7f7", color: "#666", border: "1px solid #eee" }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <>
          <div
            style={{
              fontWeight: 700,
              fontSize: 21,
              marginBottom: 10,
              color: "#2b2c2f",
              overflow: "hidden",
              textOverflow: "ellipsis"
            }}
            title={goal.name}
          >
            {goal.name}
          </div>
          <div
            style={{
              margin: "3px 0 8px 0",
              fontSize: 14,
              color: colors.accent,
              fontWeight: 500
            }}
          >
            Target: ₹{goal.target.toLocaleString()}{" "}
            {goal.deadline && (
              <span style={{ color: "#668be9", marginLeft: 12 }}>
                by {goal.deadline}
              </span>
            )}
          </div>
          <ProgressBar percent={percent} colors={colors} />
          <div style={{ margin: "7px 0 17px", fontSize: 15, color: "#545454" }}>
            Saved: ₹{goal.saved.toLocaleString()} / ₹{goal.target.toLocaleString()}
          </div>
          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 10
            }}
          >
            <button
              className="btn"
              style={{
                background: colors.accent,
                color: "#fff",
                fontWeight: 500
              }}
              onClick={() => onOpenContributionCalc(goal)}
            >
              Add Contribution
            </button>
            <button
              className="btn"
              style={{
                background: "#fff",
                color: colors.primary,
                border: `1px solid ${colors.primary}`,
                fontWeight: 500
              }}
              onClick={() => setEditMode(true)}
            >
              Edit
            </button>
            <button
              className="btn"
              style={{
                background: "#fff",
                color: "#c23c2a",
                border: "1px solid #ffd2d2",
                fontWeight: 500
              }}
              onClick={() => onDelete(goal.id)}
            >
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ProgressBar({ percent, colors }) {
  return (
    <div style={{ margin: "12px 0", width: "100%" }}>
      <div
        style={{
          background: "#e9ecef",
          borderRadius: 9,
          height: 16,
          overflow: "hidden"
        }}
      >
        <div
          style={{
            background: `linear-gradient(90deg, ${colors.primary} 65%, ${colors.secondary} 100%)`,
            width: `${percent}%`,
            height: 16,
            borderRadius: 8,
            transition: "width 0.8s cubic-bezier(0.21,1.12,0.27,0.93)"
          }}
        ></div>
      </div>
      <div
        style={{
          fontSize: 13,
          color: percent >= 100 ? colors.primary : "#888",
          textAlign: "right",
          marginTop: 1,
          fontWeight: percent >= 100 ? 600 : 400,
          letterSpacing: 0.2
        }}
      >
        {percent}%
      </div>
    </div>
  );
}

// Contribution Calculator Modal
function ContributionCalcModal({ goal, onClose, onAddContribution, colors }) {
  const [income, setIncome] = useState("");
  const [spend, setSpend] = useState("");
  const [suggested, setSuggested] = useState(0);
  const [custom, setCustom] = useState("");
  useEffect(() => {
    // Calculate automatically when inputs change
    const incomeNum = Number(income);
    const spendNum = Number(spend);
    if (incomeNum > 0) {
      // Suggest ~5-15% of free income after spending or even lower for students
      const suggestion = Math.round(Math.max((incomeNum - spendNum) * 0.1, 50));
      setSuggested(suggestion > 0 ? suggestion : 0);
    } else {
      setSuggested(0);
    }
  }, [income, spend]);
  return (
    <Modal onClose={onClose}>
      <h3 style={{ color: colors.primary }}>Smart Contribution Calculator</h3>
      <div style={{ margin: "12px 0" }}>
        <div style={{ marginBottom: 8, fontWeight: 500 }}>
          For goal: <span style={{ color: colors.accent }}>{goal.name}</span>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <input
            type="number"
            placeholder="Monthly Income (₹)"
            value={income}
            onChange={(e) => setIncome(e.target.value)}
            style={{ width: "47%" }}
          />
          <input
            type="number"
            placeholder="Monthly Spending (₹)"
            value={spend}
            onChange={(e) => setSpend(e.target.value)}
            style={{ width: "47%" }}
          />
        </div>
        <div style={{ margin: "14px 0 7px", color: "#465", fontWeight: 500 }}>
          Suggested savings per period:{" "}
          <span style={{ color: colors.primary, fontWeight: 700 }}>
            ₹{suggested || "-"}
          </span>
        </div>
        <div style={{ margin: "10px 0" }}>
          <input
            type="number"
            placeholder="Custom contribution (₹)"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            style={{ width: "60%", fontSize: 17 }}
          />
          <button
            className="btn"
            style={{
              marginLeft: 10,
              background: colors.secondary,
              color: "#fff",
              fontWeight: 500
            }}
            onClick={() =>
              onAddContribution(Number(custom || suggested || 0))
            }
            disabled={
              Number(custom) <= 0 && Number(suggested) <= 0
            }
          >
            Add
          </button>
        </div>
        <span style={{ color: "#aaa", fontSize: 13, lineHeight: 1.5 }}>
          No real money moves here! This is your virtual savings piggy bank.
        </span>
      </div>
    </Modal>
  );
}

// Add new goal modal
function AddGoalModal({ onClose, onCreateGoal, colors }) {
  const [goal, setGoal] = useState({
    name: "",
    target: "",
    deadline: "",
    remindersEnabled: true
  });
  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setGoal((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  }
  const canSave =
    goal.name.length > 0 && Number(goal.target) > 0 && goal.target.length > 0;

  function handleSubmit() {
    if (!canSave) return;
    onCreateGoal({ ...goal, target: Number(goal.target) });
    onClose();
  }

  return (
    <Modal onClose={onClose}>
      <h3 style={{ color: colors.primary, marginBottom: 10 }}>
        Create New Goal
      </h3>
      <input
        name="name"
        value={goal.name}
        onChange={handleChange}
        placeholder="Goal Name"
        maxLength={24}
        style={{ fontSize: 16, fontWeight: 500, width: "90%", margin: "7px 0" }}
      />
      <input
        name="target"
        type="number"
        value={goal.target}
        onChange={handleChange}
        placeholder="Target Amount (₹)"
        min={1}
        style={{ width: "90%", margin: "7px 0" }}
      />
      <input
        name="deadline"
        type="date"
        value={goal.deadline}
        onChange={handleChange}
        style={{ width: "90%", margin: "7px 0" }}
      />
      <div style={{ margin: "11px 0" }}>
        <label>
          <input
            name="remindersEnabled"
            type="checkbox"
            checked={goal.remindersEnabled}
            onChange={handleChange}
            style={{ marginRight: 6 }}
          />{" "}
          Enable Reminders
        </label>
      </div>
      <div style={{ marginTop: 12 }}>
        <button
          className="btn"
          onClick={handleSubmit}
          style={{
            background: colors.accent,
            color: "#fff",
            marginRight: 6
          }}
          disabled={!canSave}
        >
          Save Goal
        </button>
        <button
          className="btn"
          onClick={onClose}
          style={{ background: "#eee", color: "#868686" }}
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
}

// Modal reusable
function Modal({ children, onClose }) {
  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(30,36,42,0.14)",
        zIndex: 1002,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 14,
          boxShadow: "0 2px 20px 2px #e4e8fa",
          padding: "32px 26px 23px 26px",
          minWidth: 320,
          width: 390,
          maxWidth: "97vw"
        }}
      >
        <div style={{ position: "absolute", right: 28, top: 18 }}>
          <button
            onClick={onClose}
            style={{
              background: "#eee",
              color: "#5f5f5f",
              fontWeight: 700,
              border: "none",
              borderRadius: 100,
              fontSize: 19,
              cursor: "pointer"
            }}
            title="close"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Reminders notification panel (simple for demo)
function RemindersPanel({ reminders, colors }) {
  if (!reminders || reminders.length === 0) return null;
  return (
    <div
      style={{
        background: colors.secondary,
        color: "#633c00",
        borderRadius: 10,
        padding: "10px 22px",
        margin: "35px 0 0 0",
        boxShadow: "0 2px 12px 0 #fffacd1a",
        fontSize: 15
      }}
    >
      <span style={{ fontWeight: 700, fontSize: 16, color: "#795000" }}>
        ⏰ Reminder:
      </span>
      <ul style={{ margin: 0, padding: "0 0 0 20px" }}>
        {reminders.map((r, i) => (
          <li key={i} style={{ marginBottom: 4 }}>
            {r.reminder}
            {r.msg && (
              <span style={{ marginLeft: 8, color: colors.primary }}>
                {r.msg}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// User Preferences Panel
function UserPreferencesPanel({ preferences, onUpdate, colors }) {
  const options = ["Daily", "Weekly", "Off"];
  return (
    <div
      style={{
        margin: "32px 0 12px 0",
        background: colors.card,
        borderRadius: 12,
        padding: "14px 21px 13px",
        boxShadow: "0 2px 14px 0 #f1f1f170"
      }}
    >
      <div style={{ fontWeight: 600, color: colors.primary, marginBottom: 6 }}>
        Preferences & Reminders
      </div>
      <div style={{ fontSize: 15, color: "#444", display: "flex", alignItems: "center", gap: 14 }}>
        <div>
          Reminder Frequency:{" "}
          <select
            style={{
              border: `1.5px solid ${colors.primary}`,
              borderRadius: 5,
              fontSize: 14,
              marginLeft: 5
            }}
            value={preferences.reminderFrequency}
            onChange={(e) => onUpdate({ reminderFrequency: e.target.value })}
          >
            {options.map((x) => (
              <option value={x} key={x}>
                {x}
              </option>
            ))}
          </select>
        </div>
        <div style={{ marginLeft: 9 }}>
          <label style={{ fontWeight: 500 }}>
            <input
              type="checkbox"
              checked={preferences.notificationEnabled}
              onChange={(e) => onUpdate({ notificationEnabled: !!e.target.checked })}
              style={{ marginRight: 4 }}
            />
            Enable Notifications
          </label>
        </div>
      </div>
    </div>
  );
}

// ---- END COMPONENTS ----

/** Simple modular onboarding flow state **/
function SignUpScreen({ onComplete }) {
  // Minimalist sign up simulation for demo
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  function handleSubmit(e) {
    e.preventDefault();
    if (name && email) {
      setSubmitted(true);
      setTimeout(() => onComplete({ name, email }), 700);
    }
  }
  return (
    <div className="app" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#ffffffaa", borderRadius: 12, padding: "38px 32px 23px", boxShadow: "0 8px 44px #d7e8ff3e", maxWidth: 380, width: "91%" }}>
        <div className="logo" style={{ fontSize: 28, fontWeight: 700, color: "#4CAF50", marginBottom: 12 }}>
          <span role="img" aria-label="goal">🏆</span>
          GoalSaver
        </div>
        <div style={{ fontSize: 21, fontWeight: 600, marginBottom: 8 }}>Welcome! Sign Up</div>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 15 }}>
          <input
            style={{ fontSize: 16, padding: "10px 7px", borderRadius: 4, marginBottom: 4, border: "1.5px solid #ddd" }}
            placeholder="Your Name" value={name} onChange={e => setName(e.target.value)} maxLength={25} required />
          <input
            style={{ fontSize: 16, padding: "10px 7px", borderRadius: 4, marginBottom: 6, border: "1.5px solid #ddd" }}
            type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
          <button className="btn btn-large" style={{ background: "#4CAF50", color: "#fff", fontWeight: 600, fontSize: 18 }} disabled={submitted}>
            {submitted ? "Signing up..." : "Sign Up"}
          </button>
        </form>
      </div>
    </div>
  );
}

function PersonalityQuizScreen({ onComplete }) {
  // Minimal goal personality quiz simulation for demo
  const [stage, setStage] = useState(0);
  const [answers, setAnswers] = useState({});
  const questions = [
    {
      q: "How do you usually save money?",
      a: [
        { v: "Automatic every month", t: "Disciplined" },
        { v: "Whatever's left after expenses", t: "Flexible" },
        { v: "I rarely save", t: "Adventurous" }
      ]
    },
    {
      q: "Pick your savings goal horizon:",
      a: [
        { v: "Short-term (gadgets, events)", t: "Quick-Achiever" },
        { v: "Medium (trips, courses)", t: "Planned" },
        { v: "Long-term (major purchases)", t: "Visionary" }
      ]
    },
    {
      q: "What motivates you most?",
      a: [
        { v: "Visual progress/tracking", t: "Visualizer" },
        { v: "Reminders and nudges", t: "Habit builder" },
        { v: "Celebrating milestones", t: "Reward-seeker" }
      ]
    }
  ];
  function handleSelect(val) {
    setAnswers(a => ({ ...a, [stage]: val }));
    if (stage < questions.length - 1) {
      setTimeout(() => setStage(stage + 1), 400);
    } else {
      setTimeout(() => onComplete(answers), 800);
    }
  }
  return (
    <div className="app" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#ffffff", borderRadius: 13, padding: "34px 26px 25px", boxShadow: "0 8px 44px #bbcfd82e", minWidth: 330, width: "91%", maxWidth: 400 }}>
        <div style={{ fontWeight: 700, color: "#2196F3", marginBottom: 5, fontSize: 22 }}>
          GoalSaver Personality Quiz
        </div>
        <div style={{ fontSize: 15, color: "#555", marginBottom: 3 }}>Step {stage + 1} of {questions.length}</div>
        <div style={{ fontSize: 18, fontWeight: 600, margin: "13px 0 15px" }}>
          {questions[stage].q}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          {questions[stage].a.map(choice => (
            <button
              key={choice.v}
              className="btn"
              style={{
                fontSize: 16,
                background: "#4CAF50",
                color: "#fff",
                marginBottom: 4,
                fontWeight: 600,
                borderRadius: 7
              }}
              onClick={() => handleSelect(choice.t)}
              disabled={answers[stage] !== undefined}
            >
              {choice.v}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * PUBLIC_INTERFACE
 * App's main routing and user personality context logic.
 * After signup and quiz, user's "persona" result is available for savings suggestion.
 */
const PersonaContext = React.createContext(null);

function analyzePersona(quizAnswers) {
  // Analysis logic: Tally results to produce 1 main persona string (modular, customizable)
  if (!quizAnswers) return null;
  // Count frequency of each selected personality tag
  const tally = {};
  Object.values(quizAnswers).forEach(q => {
    tally[q] = (tally[q] || 0) + 1;
  });
  // Sorted list, most frequent persona comes first; fallback is 'Balanced'
  const personas = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  return personas.length > 0 ? personas[0][0] : "Balanced";
}

function App() {
  // Global state for onboarding flow: steps - SignUp -> Quiz -> Dashboard
  const [onboarding, setOnboarding] = useState(() => ({
    step: "signup", user: null, quiz: null
  }));

  /** Onboarding and quiz logic **/
  function handleSignUp(userProfile) {
    setOnboarding({ step: "quiz", user: userProfile, quiz: null });
  }
  function handleQuizComplete(quizAnswers) {
    setOnboarding(prev => ({
      ...prev, step: "dashboard", quiz: quizAnswers
    }));
  }

  // Determine persona from quiz for use across the app
  const persona = analyzePersona(onboarding.quiz);

  // Route user in onboarding
  if (onboarding.step === "signup") {
    return <SignUpScreen onComplete={handleSignUp} />;
  }
  if (onboarding.step === "quiz") {
    return <PersonalityQuizScreen onComplete={handleQuizComplete} />;
  }

  // Provide persona to dashboard and children via context
  return (
    <PersonaContext.Provider value={persona}>
      <GoalSaverDashboard persona={persona} />
    </PersonaContext.Provider>
  );
}

export { PersonaContext }; // allow consumption by modular panels
export default App;

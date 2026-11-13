import React, { useState, useMemo } from 'react';
import { ReactFlow, Background, Controls, Handle, Position } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useAccount } from '../../hooks/useAccount';
import { useToast } from '../../hooks/useToast';
import { WORKFLOW_DEFINITIONS } from '../../config/constants';

function getNodeIcon(type) {
  switch (type) {
    case 'trigger':
      return '⚡';
    case 'cond':
      return '?';
    case 'action':
      return '✦';
    default:
      return '•';
  }
}

function getNodeColor(type) {
  switch (type) {
    case 'trigger':
      return '#6d3df2';
    case 'cond':
      return '#e0971f';
    case 'action':
      return '#d62f8e';
    default:
      return '#6b6a85';
  }
}

function WorkflowStepNode({ data }) {
  const { step, isSelected } = data;
  return (
    <div
      className={`w-48 p-3.5 rounded-2xl border-2 text-left shadow-sm transition-all select-none ${
        isSelected
          ? 'border-[var(--br)] ring-4 ring-[var(--brs)] bg-[var(--sf)]'
          : 'border-[var(--ln)] bg-[var(--sf)] hover:border-[var(--mu)]'
      }`}
    >
      {step.type !== 'trigger' && (
        <Handle type="target" position={Position.Left} style={{ background: 'var(--br)' }} />
      )}
      <small className="flex items-center gap-2 font-bold text-[11px] text-[var(--mu)] mb-1">
        <span
          className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[11px] font-bold"
          style={{ background: getNodeColor(step.type) }}
        >
          {getNodeIcon(step.type)}
        </span>
        <span>
          {step.type === 'trigger'
            ? 'Trigger'
            : step.type === 'cond'
            ? 'Condition'
            : 'Action'}
        </span>
      </small>
      <b className="block text-xs font-bold text-[var(--tx)] truncate">{step.key}</b>
      <span className="block text-[11px] text-[var(--mu)] truncate mt-0.5">{step.detail}</span>
      <Handle type="source" position={Position.Right} style={{ background: 'var(--br)' }} />
    </div>
  );
}

const NODE_TYPES = {
  workflowStep: WorkflowStepNode,
};

function evaluateWorkflowSteps(steps, { sampleComment, sampleFollowers }) {
  let conditionPassed = true;
  const conditionNotes = [];
  const actionsExecuted = [];

  for (const step of steps) {
    if (step.type === 'cond') {
      if (step.key === 'Keyword matches') {
        const keywords = String(step.detail || '')
          .replace(/[“”"']/g, '')
          .split(',')
          .map((k) => k.trim().toLowerCase())
          .filter(Boolean);
        const commentLower = sampleComment.toLowerCase();
        const matched = keywords.length === 0 || keywords.some((kw) => commentLower.includes(kw));
        if (!matched) conditionPassed = false;
        conditionNotes.push(
          matched
            ? `Keyword matched (${keywords.join(', ')})`
            : `Comment "${sampleComment}" missed [${keywords.join(', ')}]`
        );
      } else if (step.key === 'Follower count over') {
        const numMatch = String(step.detail || '').replace(/,/g, '').match(/\d+/);
        const threshold = numMatch ? Number(numMatch[0]) : 1000;
        const matched = sampleFollowers >= threshold;
        if (!matched) conditionPassed = false;
        conditionNotes.push(`Followers ${sampleFollowers} vs >= ${threshold}`);
      } else {
        conditionNotes.push(`${step.key}: evaluated`);
      }
    } else if (step.type === 'action' && conditionPassed) {
      actionsExecuted.push(`${step.key} (${step.detail})`);
    }
  }

  if (!conditionPassed) {
    return {
      passed: false,
      summary: `Test stopped at condition: ${conditionNotes.join('; ')}`,
    };
  }

  return {
    passed: true,
    summary: `Test executed: ${actionsExecuted.join(' → ') || 'Trigger matched'}`,
  };
}

export default function AutomationsView() {
  const {
    automations,
    selectedAutomationIndex,
    setSelectedAutomationIndex,
    toggleAutomation,
    addAutomation,
    deleteAutomation,
    updateAutomationSteps,
    updateAutomationName,
    recordAutomationExecution,
  } = useAccount();

  const { showToast } = useToast();
  const [selectedNodeIndex, setSelectedNodeIndex] = useState(0);
  const [sampleComment, setSampleComment] = useState('What is the price link?');
  const [sampleFollowers, setSampleFollowers] = useState(1500);
  const [isTesting, setIsTesting] = useState(false);

  const activeAutomation =
    automations[selectedAutomationIndex] || automations[0] || null;

  const currentSteps = useMemo(() => activeAutomation?.steps || [], [activeAutomation]);
  const selectedStep = currentSteps[selectedNodeIndex] || currentSteps[0];

  const flowNodes = useMemo(
    () =>
      currentSteps.map((step, idx) => ({
        id: String(idx),
        type: 'workflowStep',
        position: { x: idx * 240 + 24, y: 72 },
        data: {
          step,
          isSelected: idx === selectedNodeIndex,
        },
        draggable: false,
      })),
    [currentSteps, selectedNodeIndex]
  );

  const flowEdges = useMemo(
    () =>
      currentSteps.slice(0, -1).map((_, idx) => ({
        id: `e_${idx}_${idx + 1}`,
        source: String(idx),
        target: String(idx + 1),
        animated: Boolean(activeAutomation?.enabled),
        style: { stroke: 'var(--br)', strokeWidth: 2 },
      })),
    [currentSteps, activeAutomation?.enabled]
  );

  const handleToggle = (e, auto) => {
    e.stopPropagation();
    toggleAutomation(auto.id);
    showToast(auto.enabled ? 'Automation paused' : 'Automation turned on');
  };

  const handleAddNewAutomation = async () => {
    const newAuto = {
      id: `auto_${Date.now()}`,
      name: 'Comment keyword → DM',
      enabled: false,
      runs: 0,
      steps: [
        { type: 'trigger', key: 'New comment', detail: 'On any Reel' },
        { type: 'cond', key: 'Keyword matches', detail: '“price”, “link”' },
        { type: 'action', key: 'Send DM', detail: 'Send product link' },
      ],
    };
    await addAutomation(newAuto);
    setSelectedNodeIndex(0);
    showToast('New workflow created in Firestore!');
  };

  const handleAddStep = (type) => {
    if (!activeAutomation) return;
    const defaultItem =
      type === 'cond'
        ? WORKFLOW_DEFINITIONS.conditions[0]
        : WORKFLOW_DEFINITIONS.actions[0];

    const newStep = {
      type,
      key: defaultItem.label,
      detail: defaultItem.defaultDetail,
    };

    const updated = [...currentSteps, newStep];
    updateAutomationSteps(selectedAutomationIndex, updated);
    setSelectedNodeIndex(updated.length - 1);
    showToast(`Added ${type === 'cond' ? 'Condition' : 'Action'} step`);
  };

  const handleRemoveStep = () => {
    if (currentSteps.length <= 2) {
      showToast('A workflow requires at least 1 trigger and 1 action.');
      return;
    }
    const updated = currentSteps.filter((_, idx) => idx !== selectedNodeIndex);
    updateAutomationSteps(selectedAutomationIndex, updated);
    setSelectedNodeIndex(0);
    showToast('Step removed');
  };

  const handleChangeStepType = (newKey) => {
    const stepType = selectedStep.type;
    const lookupList =
      stepType === 'trigger'
        ? WORKFLOW_DEFINITIONS.triggers
        : stepType === 'cond'
        ? WORKFLOW_DEFINITIONS.conditions
        : WORKFLOW_DEFINITIONS.actions;

    const found = lookupList.find((item) => item.label === newKey);
    const detail = found ? found.defaultDetail : selectedStep.detail;

    const updated = currentSteps.map((s, idx) =>
      idx === selectedNodeIndex ? { ...s, key: newKey, detail } : s
    );
    updateAutomationSteps(selectedAutomationIndex, updated);
  };

  const handleChangeDetail = (newDetail) => {
    const updated = currentSteps.map((s, idx) =>
      idx === selectedNodeIndex ? { ...s, detail: newDetail } : s
    );
    updateAutomationSteps(selectedAutomationIndex, updated);
  };

  const handleRunTest = async () => {
    if (!activeAutomation || isTesting) return;
    setIsTesting(true);
    try {
      const evalResult = evaluateWorkflowSteps(currentSteps, {
        sampleComment,
        sampleFollowers: Number(sampleFollowers) || 0,
      });
      await recordAutomationExecution(activeAutomation, evalResult);
      showToast(evalResult.summary);
    } catch (err) {
      showToast(err?.message || 'Failed to record workflow test run');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-[var(--mu)] m-0">
          Build “when this happens, do that” visual flows for your Instagram accounts.
        </p>
        <button
          type="button"
          onClick={handleAddNewAutomation}
          className="px-4 py-2 rounded-xl text-xs md:text-sm font-semibold text-white shadow-xs hover:opacity-95 transition-all border-0"
          style={{ background: 'var(--g)' }}
        >
          + New automation
        </button>
      </div>

      {/* Meta API Verification Notice */}
      <div
        className="p-3.5 rounded-2xl border text-xs"
        style={{ background: 'var(--sf)', borderColor: 'var(--ln)' }}
      >
        <div className="flex items-center gap-2 font-bold text-[var(--tx)] mb-1">
          <span>🛡️ Meta Instagram API Compliance Guide</span>
        </div>
        <p className="m-0 text-[var(--mu)] leading-relaxed">
          • <b>Comment to DM:</b> Powered by Meta's official Private Replies API (1 direct message allowed within 7 days).<br />
          • <b>Inbound DMs:</b> Standard 24-hour Instagram Messaging API window applies for direct responses.<br />
          • <b>Live Meta Webhooks:</b> Receiving real-time Meta comments externally requires deploying Cloud Functions (Blaze) or exposing a public HTTPS webhook URL.
        </p>
      </div>

      {/* Top Automations Selector Grid */}
      {automations.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {automations.map((auto, idx) => {
            const isSelected = idx === selectedAutomationIndex;
            return (
              <div
                key={auto.id}
                onClick={() => {
                  setSelectedAutomationIndex(idx);
                  setSelectedNodeIndex(0);
                }}
                className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-[var(--br)] ring-2 ring-[var(--brs)] bg-[var(--sf)]'
                    : 'border-[var(--ln)] bg-[var(--sf)] hover:border-[var(--mu)]'
                }`}
              >
                <div className="min-w-0">
                  <b className="block text-sm font-bold text-[var(--tx)] truncate">{auto.name}</b>
                  <span className="text-xs text-[var(--mu)] truncate block mt-0.5">
                    {auto.steps.length} steps · {auto.runs || 0} runs
                  </span>
                </div>
                <button
                  type="button"
                  className={`sw ${auto.enabled ? 'on' : ''}`}
                  onClick={(e) => handleToggle(e, auto)}
                  aria-label="Toggle automation state"
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div
          className="p-8 text-center rounded-2xl border text-xs text-[var(--mu)]"
          style={{ background: 'var(--sf)', borderColor: 'var(--ln)' }}
        >
          No automation workflows created yet. Click <b>+ New automation</b> to build one in React Flow.
        </div>
      )}

      {/* Selected Automation Canvas & Inspector */}
      {activeAutomation && (
        <div
          className="p-5 rounded-2xl border flex flex-col gap-4"
          style={{ background: 'var(--sf)', borderColor: 'var(--ln)' }}
        >
          {/* Header of selected automation */}
          <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b" style={{ borderColor: 'var(--ln)' }}>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={activeAutomation.name}
                onChange={(e) => updateAutomationName(selectedAutomationIndex, e.target.value)}
                className="font-bold text-base text-[var(--tx)] bg-transparent border-b border-transparent hover:border-[var(--ln)] focus:border-[var(--br)] px-1 py-0.5 outline-hidden"
              />
              <span className={`chip ${activeAutomation.enabled ? 'c-ok' : 'c-mu'}`}>
                {activeAutomation.enabled ? 'Live' : 'Paused'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isTesting}
                onClick={handleRunTest}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border hover:bg-[var(--sf2)] transition-colors"
                style={{ background: 'var(--sf)', borderColor: 'var(--ln)' }}
              >
                {isTesting ? 'Running...' : 'Test run'}
              </button>
              <button
                type="button"
                onClick={async () => {
                  await deleteAutomation(activeAutomation.id);
                  showToast('Workflow deleted');
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border text-[var(--er)] hover:bg-[var(--ers)] transition-colors"
                style={{ background: 'var(--sf)', borderColor: 'var(--ln)' }}
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => showToast('Workflow changes sync automatically to Firestore!')}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white border-0"
                style={{ background: 'var(--g)' }}
              >
                Saved
              </button>
            </div>
          </div>

          {/* Builder Layout: React Flow Canvas + Inspector Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4 items-start">
            {/* React Flow Visual Workflow Canvas */}
            <div
              className="rounded-2xl border h-[300px] overflow-hidden relative shadow-inner"
              style={{
                backgroundColor: 'var(--sf2)',
                borderColor: 'var(--ln)',
              }}
            >
              <ReactFlow
                nodes={flowNodes}
                edges={flowEdges}
                nodeTypes={NODE_TYPES}
                onNodeClick={(_e, node) => setSelectedNodeIndex(Number(node.id))}
                fitView
                proOptions={{ hideAttribution: true }}
              >
                <Background gap={20} size={1} color="var(--ln)" />
                <Controls showInteractive={false} />
              </ReactFlow>
            </div>

            {/* Step Palette, Node Inspector & Test Payload */}
            <div
              className="p-4 rounded-2xl border flex flex-col gap-3"
              style={{ background: 'var(--sf)', borderColor: 'var(--ln)' }}
            >
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--mu)] m-0 mb-2">
                  Add Step
                </h4>
                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleAddStep('cond')}
                    className="w-full text-left p-2 rounded-xl border border-dashed text-xs font-bold hover:border-[var(--br)] hover:bg-[var(--brs)] transition-colors"
                    style={{ borderColor: 'var(--ln)' }}
                  >
                    + Condition Node
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddStep('action')}
                    className="w-full text-left p-2 rounded-xl border border-dashed text-xs font-bold hover:border-[var(--br)] hover:bg-[var(--brs)] transition-colors"
                    style={{ borderColor: 'var(--ln)' }}
                  >
                    + Action Node
                  </button>
                </div>
              </div>

              {/* Inspector Configuration */}
              {selectedStep && (
                <div className="pt-3 border-t flex flex-col gap-3" style={{ borderColor: 'var(--ln)' }}>
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-[var(--tx)] m-0">
                      Configure “{selectedStep.key}”
                    </h4>
                    <span
                      className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[10px]"
                      style={{ background: getNodeColor(selectedStep.type) }}
                    >
                      {getNodeIcon(selectedStep.type)}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--mu)] mb-1">
                      Step Type
                    </label>
                    <select
                      value={selectedStep.key}
                      onChange={(e) => handleChangeStepType(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl border text-xs"
                      style={{ background: 'var(--sf)', borderColor: 'var(--ln)' }}
                    >
                      {(selectedStep.type === 'trigger'
                        ? WORKFLOW_DEFINITIONS.triggers
                        : selectedStep.type === 'cond'
                        ? WORKFLOW_DEFINITIONS.conditions
                        : WORKFLOW_DEFINITIONS.actions
                      ).map((item) => (
                        <option key={item.id} value={item.label}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--mu)] mb-1">
                      Details / Rules
                    </label>
                    <input
                      type="text"
                      value={selectedStep.detail}
                      onChange={(e) => handleChangeDetail(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl border text-xs"
                      style={{ background: 'var(--sf)', borderColor: 'var(--ln)' }}
                    />
                  </div>

                  {selectedStep.type !== 'trigger' && (
                    <button
                      type="button"
                      onClick={handleRemoveStep}
                      className="py-1.5 px-3 rounded-lg text-xs font-semibold text-[var(--er)] hover:bg-[var(--ers)] transition-colors text-left border-0 bg-transparent"
                    >
                      Remove this step
                    </button>
                  )}
                </div>
              )}

              {/* Test Run Simulator Inputs */}
              <div className="pt-3 border-t flex flex-col gap-2" style={{ borderColor: 'var(--ln)' }}>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--mu)] m-0">
                  Test Simulator Input
                </h4>
                <input
                  type="text"
                  value={sampleComment}
                  onChange={(e) => setSampleComment(e.target.value)}
                  placeholder="Sample comment / DM..."
                  className="w-full px-2.5 py-1.5 rounded-xl border text-xs"
                  style={{ background: 'var(--sf2)', borderColor: 'var(--ln)' }}
                />
                <input
                  type="number"
                  value={sampleFollowers}
                  onChange={(e) => setSampleFollowers(Number(e.target.value))}
                  placeholder="Sample follower count"
                  className="w-full px-2.5 py-1.5 rounded-xl border text-xs"
                  style={{ background: 'var(--sf2)', borderColor: 'var(--ln)' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

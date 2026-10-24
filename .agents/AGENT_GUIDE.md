# ðŸ¤– Agent Operations Guide: Job Search MCP Master Engine

## 1. Repository Purpose & Architecture
**Repository:** $(System.Collections.Hashtable.Name)  
**Domain/Purpose:** Master central intelligence, lead aggregator, deduplicator, email dispatcher, and multi-portal orchestrator for all job search pipelines (LinkedIn, Naukri, Telegram, etc.).  
**Agent Role:** Pipeline Slot manager (Slot 1-5), candidate profile screening, master jobs database manager, and automated email dispatcher.

## 2. Key Files & Entry Points
- `MASTER_JOBS_LIFETIME_DATABASE.json`
- `candidate_screening_profile.json`
- `launch_brave_cdp.bat`
- `PENDING_AND_VERIFIED_PIPELINE.md`

## 3. Execution & Workflow
- **Standard Command / Trigger:** `node scripts/ or batch scripts for pipeline orchestration and dispatching.`
- Always verify environment variables, dependencies, and prerequisites before executing scripts.
- Never hardcode sensitive tokens or personal credentials directly into tracked files.

## 4. Cross-Agent Continuity
When switching between different autonomous agents:
1. Always read this file first before making changes or executing runs.
2. Maintain all existing state files and audit logs.
3. Keep user output structured and deterministic as specified in `OUTPUT_FORMAT.md`.

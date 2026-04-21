# **Product Requirements Document (PRD): Unified Block Project Manager (MVP)**

**Status:** Draft / Proposal

**Author:** Nathanael Lie

**Architecture Pattern:** Single-Entity Recursive Tree (WBS-style)

## **1\. Executive Summary & Vision**

Proyek ini bertujuan untuk membangun alat manajemen proyek berkonsep WBS (Work Breakdown Structure) yang menghilangkan batasan kaku antara "Project", "Milestone", dan "Task". Dengan menggunakan entitas tunggal bernama **Block** , sistem ini dirancang untuk menyelesaikan pain points utama terkait **Visibilitas** , yaitu memberikan kejelasan absolut terhadap:

* Status dan detail Tasks harian.

* Impact dari sebuah Task terhadap produk secara keseluruhan.

* Prioritas Product Engineering secara makro.

* Prioritas masing-masing Individual Contributor (IC).

* Beban kerja (Workload) dari setiap IC.

* Format pelaporan (Reporting) terpusat yang relevan bagi CEO, PM, hingga IC.

**The Single Source of Truth:** Seluruh anggota organisasi—dimulai dari tim engineering—memiliki satu target dan satu format reporting yang seragam. Semuanya mengacu pada data tree yang sama tanpa perlu sinkronisasi manual antar platform.

**The "Dream" & Future Integrations:** Project Management Custom Dashboard untuk role-specific views dan Agentic Integration agar AI/Coding Agent dapat mengelola blok secara otonom.

## **2\. Problem Statement**

Banyak project management tools memiliki kategorisasi entitas yang berlapis-lapis, menciptakan overhead administratif dan fragmentasi konteks. Kita membutuhkan sistem yang "datar" secara skema namun "dalam" secara fungsional untuk menjaga visibilitas dari level mikro hingga makro.

## **3\. Product Philosophy**

* **Everything is a Block:** Tidak ada perbedaan antara proyek besar dan tugas kecil di level database.

* **Gantt-First:** Visualisasi utama berupa timeline untuk dependensi dan durasi.

* **Context-Aware:** Akses tembus pandang ke ancestor blocks untuk memahami "mengapa" sebuah tugas dikerjakan.

## **4\. Technical Architecture & Data Model**

### ***A. Table: blocks***

| Column | Type | Constraints | Description |
| ----- | ----- | ----- | ----- |
| id | UUID | PK | Unique Identifier. |
| parent\_id | UUID | FK, Nullable | Self-referencing link. |
| title | String | Not Null | Nama tugas/blok. |
| status | Enum | Not Null | triage, backlog, todo, inprogress, done. |
| start\_date | Timestamp | Nullable | Auto-rollup or Manual. |
| deadline | Timestamp | Nullable | Hard deadline. |

### 

### ***B. Table: comments***

| Column | Type | Description |
| ----- | ----- | ----- |
| id | UUID | Unique Identifier. |
| block\_id | UUID | Relasi ke blok terkait. |
| content | Text | Isi komentar. |

## 

## **5\. Core Features & Business Logic**

### ***5.1 Dynamic Date Rollup***

Parent nodes menghitung start\_date \= MIN(child) dan end\_date \= MAX(child) secara otomatis. Perubahan child memicu cascade up.

### ***5.2 User Roles & Permissions***

* **Admin:** Akses penuh ke seluruh tree dan Master Gantt Chart.

* **Regular User (IC):** Melihat blok tugas sendiri \+ Read-Only ancestor path.

* **Agent (AI):** Hak akses setara admin via API/Hooks untuk otonomi manajemen.

## **6\. Development Roadmap**

### ***Phase 1: MVP Core & Agentic Foundations (Target: 2-3 Jam)***

Backend CRUD, Admin-side Gantt UI, dan Agent Integration via API.

### ***Phase 2: IC View & Automation (Target: 2 Jam)***

IC-side Gantt chart dan reporting otomatis ke Slack channel.

### ***Phase 3: PM Dashboard (Target: 3-4 Jam)***

Executive summary view dan engineering lead metrics dashboard.

### ***Phase 4: Future***

Agentic (QuantumByte WorkOS) Integration, Migration Phase from Linear


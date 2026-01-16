# Tracklet Design Guidelines

## Design Approach: Enterprise Design System
**Selected System**: Carbon Design System principles - optimized for data-heavy enterprise applications with clear information hierarchy and efficient workflows.

**Rationale**: Tracklet is a utility-focused business tool prioritizing efficiency, data clarity, and multi-role workflows. The design must support rapid data entry, scanning, and retrieval while maintaining visual organization across complex datasets.

---

## Core Design Elements

### A. Typography
- **Primary Font**: IBM Plex Sans (or Inter) via Google Fonts CDN
- **Hierarchy**:
  - Page Titles: 2xl/3xl, semibold (Dashboard, Location Management)
  - Section Headers: xl, semibold (Recent Packages, Storage Locations)
  - Data Tables: base/sm, regular for content, medium for headers
  - Form Labels: sm, medium
  - Metrics/Stats: 3xl/4xl, bold for key numbers (total packages, costs)
  - Helper Text: xs/sm, regular

### B. Layout System
**Spacing Primitives**: Tailwind units of 1, 2, 4, 6, 8, 12, 16
- Component padding: p-4 to p-6
- Section spacing: gap-4 to gap-8
- Card margins: m-2 to m-4
- Form field spacing: space-y-4

**Grid Structure**:
- Admin Dashboard: Sidebar (w-64) + Main content area
- Data Tables: Full-width with responsive overflow-x-auto
- Forms: Single column (max-w-2xl) for data entry
- Cards/Stats: Grid layout (grid-cols-1 md:grid-cols-2 lg:grid-cols-4) for metrics

---

## C. Component Library

### Navigation & Structure
**Admin Sidebar Navigation**:
- Fixed left sidebar with logo at top
- Navigation items with icons (Home, Locations, Settings, Users)
- Active state clearly distinguished
- Collapse toggle for smaller screens

**Location Dashboard Header**:
- Location name prominently displayed
- Quick stats bar (Total Packages, Pending Deliveries, Total Value if pricing enabled)
- Search bar (prominent, centered or right-aligned)
- Primary action button: "Add New Package" (top-right)

### Data Display
**Package List Table**:
- Columns: Tracking Number, Recipient Name, Date of Entry, Storage Location, Weight, Cost (if enabled), Actions
- Expandable rows showing: Notes, detailed weight, pricing breakdown
- Hover states on rows
- Sortable column headers
- Pagination controls at bottom

**Search Results View**:
- Summary card at top: "Katie Bodiford - 5 Packages - $45.00 Total"
- Results displayed in same table format below
- "Print for Recipient" button in summary card

**Metrics Cards** (Dashboard):
- Clean rectangular cards with rounded corners
- Large number display
- Descriptive label below
- Icon in top-right corner
- Subtle border or shadow for depth

### Forms & Input
**Package Entry Form**:
- Single-column layout
- Fields: Tracking Number, Recipient Name, Weight, Storage Location (dropdown), Notes (textarea)
- Clear field labels above inputs
- Input fields with border, focus states
- Submit button: "Save Package" (primary action)

**Location Configuration**:
- Checkbox: "Enable Pricing Model"
- Conditional fields appear when enabled
- Radio buttons: "Per Pound" vs "Range-Based"
- Dynamic pricing tiers (add/remove rows)
- Input groups for weight ranges and costs

### Actions & Controls
**Buttons**:
- Primary: Solid fill (Add Package, Save, Print)
- Secondary: Outline style (Cancel, Edit)
- Danger: For delete actions
- Icon buttons: For expand/collapse, actions in table rows

**Print View**:
- Clean, minimal design optimized for printing
- Header: Location name, Recipient name, Date
- Table: Tracking Number, Recipient, Weight, Cost, Storage Location
- Total row at bottom with bold text
- No navigation or interactive elements

### User Management
**User List** (Admin & Location Manager views):
- Table or card layout showing: Name, Email, Role, Status
- Actions: Edit, Deactivate/Activate, Delete
- "Add User" button prominently placed
- Role badges (Admin, Manager, Employee) with distinct styling

**Role Hierarchy Visual Indicators**:
- Admin interface: Distinct header treatment or accent
- Location Manager: Middle-tier visual language
- Employee: Simplified UI with reduced permissions visible

---

## D. Interaction Patterns

### Key Workflows
1. **Package Search**: Type-ahead search with instant filtering, enter to view detailed results
2. **Package Entry**: Modal or dedicated page, auto-focus on Tracking Number field
3. **Expandable Details**: Click row to reveal additional information inline (accordion pattern)
4. **Batch Actions**: Checkboxes for selecting multiple packages, bulk action bar appears

### State Management
- **Loading**: Skeleton screens for tables, spinners for actions
- **Empty States**: Friendly messages with calls-to-action ("No packages yet. Add your first package.")
- **Error States**: Inline validation, toast notifications for system errors
- **Success States**: Toast confirmations for successful actions

### Responsive Behavior
- **Desktop (lg+)**: Full sidebar, multi-column layouts, expanded tables
- **Tablet (md)**: Collapsible sidebar, 2-column grids, horizontal scroll for tables
- **Mobile**: Bottom navigation or hamburger menu, single column, card-based package display instead of tables

---

## Images
No hero images needed. This is a business application focused on data and functionality. Use icons throughout (Material Icons CDN) for:
- Navigation items
- Action buttons
- Status indicators
- Metric cards
- Empty states

---

## Critical Design Principles
1. **Clarity Over Aesthetics**: Information density is acceptable; whitespace should aid comprehension, not dominate
2. **Scannable Data**: Tables must be easy to scan with clear alignment and hierarchy
3. **Efficient Workflows**: Minimize clicks for common actions (search, add package, print)
4. **Role-Appropriate Views**: Admins see more controls; employees see simplified interfaces
5. **Print-Ready**: Ensure print views are clean, professional, and cost-effective (minimal ink)
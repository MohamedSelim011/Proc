# 🚀 Dynamic Dashboard with Metabase Integration

## Overview
The Dynamic Dashboard provides interactive analytics and insights for your procurement data using Metabase integration. This dashboard follows the Wujha design system with orange/red gradient colors and provides both internal analytics and external Metabase dashboards.

## Features

### 🎯 **View Toggle System**
- **Internal Analytics**: Built-in charts and metrics using Recharts
- **Dynamic Dashboard**: Embedded Metabase dashboard via iframe
- **Both Views**: Side-by-side comparison of internal and external analytics

### 🎨 **Wujha Design System**
- Orange/red gradient color scheme (`#f97316` to `#ef4444`)
- Consistent with existing Wujha HR system design
- Professional white cards with subtle shadows
- Responsive design for all screen sizes

### 📊 **Chart Types**
- **Bar Charts**: Space utilization by type
- **Area Charts**: Monthly revenue trends
- **Pie Charts**: Occupancy distribution
- **Line Charts**: Building performance metrics

### 🔗 **Metabase Integration**
- Real-time health checking
- Automatic dashboard discovery
- Embedded iframe with proper authentication
- External link to edit dashboards

## Technical Implementation

### **File Structure**
```
src/app/procurement/dynamic-dashboard/
├── page.tsx                    # Main dashboard component
src/app/api/metabase/health/
├── route.ts                    # Health check endpoint
```

### **Dependencies**
- `recharts`: Chart library for internal analytics
- `lucide-react`: Icons
- `next.js`: Framework

### **API Endpoints**
- `GET /api/metabase/health`: Checks Metabase availability
- `GET /api/dashboard`: Fetches internal dashboard data

### **Metabase Configuration**
- **URL**: `https://metabase-production-9c0c.up.railway.app`
- **Dashboard ID**: `2`
- **Secret Key**: Embedded for iframe authentication

## Usage

### **Accessing the Dashboard**
1. Navigate to `/procurement/dynamic-dashboard`
2. Use the view toggle to switch between:
   - Internal Analytics
   - Dynamic Dashboard (Metabase)
   - Both Views

### **Metabase Features**
- **Edit Dashboard**: Opens Metabase in new tab for editing
- **Refresh**: Reloads the iframe content
- **Health Check**: Automatically monitors Metabase availability

### **Internal Analytics**
- Real-time data from your procurement database
- Interactive charts with hover tooltips
- Recent activity feed
- Key performance metrics

## Configuration

### **Metabase Setup**
1. Ensure Metabase is running on the configured URL
2. Create dashboards in Metabase
3. Configure embedding settings
4. Update the secret key if needed

### **Customization**
- Modify chart colors in the `COLORS` array
- Update data transformation in `fetchData()`
- Add new chart types using Recharts components
- Customize the Metabase iframe URL parameters

## Error Handling

### **Metabase Unavailable**
- Shows fallback message with "Start Metabase Service" button
- Graceful degradation to internal analytics only
- Health check every 30 seconds

### **Data Loading**
- Loading spinner with Wujha branding
- Error states with clear messaging
- Retry mechanisms for failed requests

## Design System Compliance

### **Colors**
- Primary: `#f97316` (orange-500)
- Secondary: `#ef4444` (red-500)
- Success: `#10b981` (green-500)
- Background: `#f9fafb` (gray-50)
- Cards: `#ffffff` (white)

### **Typography**
- Headers: `font-bold text-2xl`
- Subheaders: `font-semibold text-lg`
- Body: `text-sm text-gray-600`
- Labels: `text-xs font-semibold uppercase`

### **Spacing**
- Container: `p-6 space-y-6`
- Cards: `p-6`
- Grid gaps: `gap-6`
- Button padding: `px-4 py-2`

## Future Enhancements

- [ ] Real-time data updates
- [ ] Custom dashboard builder
- [ ] Export functionality
- [ ] Mobile-optimized charts
- [ ] Advanced filtering options
- [ ] Dashboard sharing capabilities

---

**🎉 Your dynamic dashboard is now ready! Navigate to `/procurement/dynamic-dashboard` to explore the interactive analytics.**

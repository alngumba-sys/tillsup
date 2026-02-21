import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area
} from "recharts";
import {
  Sparkles,
  TrendingUp,
  Users,
  ShoppingBag,
  AlertTriangle,
  CheckCircle2,
  Brain,
  Zap,
  ArrowRight,
  RefreshCw,
  MoreHorizontal,
  Lightbulb
} from "lucide-react";
import { useSubscription } from "../hooks/useSubscription";
import { useNavigate } from "react-router";
import { toast } from "sonner";

// Mock Data
const predictionData = [
  { name: "Mon", actual: 4000, predicted: 4200, lower: 3800, upper: 4600 },
  { name: "Tue", actual: 3000, predicted: 3100, lower: 2800, upper: 3400 },
  { name: "Wed", actual: 2000, predicted: 2300, lower: 2000, upper: 2600 },
  { name: "Thu", actual: 2780, predicted: 2900, lower: 2600, upper: 3200 },
  { name: "Fri", actual: 1890, predicted: 2100, lower: 1800, upper: 2400 },
  { name: "Sat", actual: 2390, predicted: 2500, lower: 2200, upper: 2800 },
  { name: "Sun", actual: 3490, predicted: 3600, lower: 3300, upper: 3900 },
];

const insights = [
  {
    id: 1,
    title: "Inventory Optimization",
    description: "High sales velocity (2.4 units/hour) detected for 'Premium Coffee Beans'. Current stock (12 bags) will be depleted by Tuesday 2 PM. Reorder immediately to avoid $450 in lost revenue.",
    type: "action",
    impact: "High",
    icon: ShoppingBag,
    action: "/app/inventory"
  },
  {
    id: 2,
    title: "Staffing Recommendation",
    description: "Predictive analysis indicates a 45% surge in footfall this Friday evening (6-9 PM) due to local events. Current roster is understaffed by 2 members. Recommended: Add 1 senior staff and 1 junior.",
    type: "info",
    impact: "Medium",
    icon: Users,
    action: "/app/staff"
  },
  {
    id: 3,
    title: "Customer Retention Risk",
    description: "3 top-tier customers (LTV > $5,000) have not visited in 30+ days. Churn risk calculated at 78%. Recommended action: Send personalized 'We Miss You' 15% discount code.",
    type: "warning",
    impact: "High",
    icon: AlertTriangle,
    action: "/app/reports"
  }
];

export function AIInsights() {
  const { hasFeature } = useSubscription();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Simple protection for direct URL access
  if (!hasFeature("aiInsights")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
          <Sparkles className="w-8 h-8 text-amber-600" />
        </div>
        <h1 className="text-2xl font-bold mb-2">AI Insights is a Premium Feature</h1>
        <p className="text-muted-foreground max-w-md mb-6">
          Upgrade to the Starter plan or higher to unlock AI-powered business intelligence, forecasting, and automated recommendations.
        </p>
        <Button onClick={() => navigate("/app/subscription")}>
          View Upgrade Options
        </Button>
      </div>
    );
  }

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setLastUpdated(new Date());
      setIsRefreshing(false);
      toast.success("AI Analysis Refreshed", {
        description: "Latest sales data has been processed."
      });
    }, 2000);
  };

  const handleTakeAction = (actionPath: string, insightTitle: string) => {
    toast.info(`Navigating to action`, {
      description: `Opening relevant page for: ${insightTitle}`
    });
    navigate(actionPath);
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2 text-foreground">
            <Sparkles className="w-8 h-8 text-indigo-500 fill-indigo-500/20" />
            AI Business Intelligence
          </h1>
          <p className="text-muted-foreground mt-1">
            Deep insights and predictive analytics for your business
          </p>
        </div>
        <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden md:inline-block">
                Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
            <Button 
                onClick={handleRefresh} 
                disabled={isRefreshing}
                className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? "Analyzing..." : "Refresh Analysis"}
            </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-background border-indigo-100 dark:border-indigo-900 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Predicted Revenue (Next 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-indigo-700 dark:text-indigo-400">$12,450</div>
            <p className="text-xs font-medium text-indigo-600 dark:text-indigo-300 flex items-center mt-2 bg-indigo-100 dark:bg-indigo-900/50 w-fit px-2 py-1 rounded-full">
              <TrendingUp className="w-3 h-3 mr-1" />
              +15% vs last week
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-emerald-50/50 to-white dark:from-emerald-950/20 dark:to-background border-emerald-100 dark:border-emerald-900 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Efficiency Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">92/100</div>
            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-300 flex items-center mt-2 bg-emerald-100 dark:bg-emerald-900/50 w-fit px-2 py-1 rounded-full">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Top 10% of similar businesses
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50/50 to-white dark:from-amber-950/20 dark:to-background border-amber-100 dark:border-amber-900 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">At-Risk Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-700 dark:text-amber-400">14</div>
            <p className="text-xs font-medium text-amber-600 dark:text-amber-300 flex items-center mt-2 bg-amber-100 dark:bg-amber-900/50 w-fit px-2 py-1 rounded-full">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Action required
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-violet-50/50 to-white dark:from-violet-950/20 dark:to-background border-violet-100 dark:border-violet-900 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">AI Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-violet-700 dark:text-violet-400">3</div>
            <p className="text-xs font-medium text-violet-600 dark:text-violet-300 flex items-center mt-2 bg-violet-100 dark:bg-violet-900/50 w-fit px-2 py-1 rounded-full">
              <Zap className="w-3 h-3 mr-1" />
              New opportunities found
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <Card className="lg:col-span-2 shadow-md border-border/60">
          <CardHeader>
            <div className="flex items-center justify-between">
                <div>
                    <CardTitle>Revenue Forecast</CardTitle>
                    <CardDescription>AI-predicted sales performance vs actuals (7 Days)</CardDescription>
                </div>
                <Badge variant="outline" className="gap-1">
                    <Brain className="w-3 h-3" />
                    Confidence: 94%
                </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={predictionData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }} 
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Legend verticalAlign="top" height={36} />
                  
                  {/* Actual Sales Line */}
                  <Area 
                    type="monotone" 
                    dataKey="actual" 
                    stroke="#94a3b8" 
                    strokeWidth={2} 
                    fill="transparent" 
                    name="Actual Sales"
                    dot={{ r: 4, fill: "#94a3b8", strokeWidth: 0 }}
                  />
                  
                  {/* Predicted Sales Area */}
                  <Area 
                    type="monotone" 
                    dataKey="predicted" 
                    stroke="#6366f1" 
                    strokeWidth={3} 
                    fill="url(#colorPredicted)" 
                    name="AI Prediction" 
                    dot={{ r: 4, fill: "#6366f1", strokeWidth: 2, stroke: "#fff" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Generated Insights List */}
        <Card className="shadow-md border-border/60 flex flex-col h-full">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/20 border-b">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lightbulb className="w-5 h-5 text-amber-500 fill-amber-500/20" />
              Smart Recommendations
            </CardTitle>
            <CardDescription>Actionable intelligence for today</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6 flex-1">
            {insights.map((insight) => {
              const Icon = insight.icon;
              return (
                <div key={insight.id} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm hover:shadow-md transition-all duration-200 group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        insight.type === 'action' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                        insight.type === 'warning' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                        'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="font-semibold text-sm line-clamp-1">{insight.title}</span>
                    </div>
                    <Badge variant="outline" className={
                      insight.impact === 'High' 
                        ? 'text-red-600 border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-900 dark:text-red-400' 
                        : 'text-slate-600 border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                    }>
                      {insight.impact} Impact
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
                    {insight.description}
                  </p>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-between h-auto py-2 px-3 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-xs font-medium rounded-lg group-hover:pr-2 transition-all"
                    onClick={() => handleTakeAction(insight.action, insight.title)}
                  >
                    Take Action <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
import { useState } from "react";
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
  BarChart,
  Bar,
  Legend
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
  RefreshCw
} from "lucide-react";
import { useSubscription } from "../hooks/useSubscription";
import { useNavigate } from "react-router";

// Mock Data
const predictionData = [
  { name: "Mon", actual: 4000, predicted: 4200 },
  { name: "Tue", actual: 3000, predicted: 3100 },
  { name: "Wed", actual: 2000, predicted: 2300 },
  { name: "Thu", actual: 2780, predicted: 2900 },
  { name: "Fri", actual: 1890, predicted: 2100 },
  { name: "Sat", actual: 2390, predicted: 2500 },
  { name: "Sun", actual: 3490, predicted: 3600 },
];

const insights = [
  {
    title: "Inventory Optimization",
    description: "Based on sales velocity, you should reorder 'Premium Coffee Beans' by Tuesday to avoid stockout.",
    type: "action",
    impact: "High",
    icon: ShoppingBag
  },
  {
    title: "Staffing Recommendation",
    description: "Expected high footfall on Friday evening. Consider adding 1 extra staff member for the 6-9 PM shift.",
    type: "info",
    impact: "Medium",
    icon: Users
  },
  {
    title: "Customer Retention Risk",
    description: "3 top customers haven't visited in 30 days. Send them a personalized discount offer.",
    type: "warning",
    impact: "High",
    icon: AlertTriangle
  }
];

export function AIInsights() {
  const { hasFeature } = useSubscription();
  const navigate = useNavigate();

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

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-indigo-500" />
            AI Business Intelligence
          </h1>
          <p className="text-muted-foreground mt-1">
            Deep insights and predictive analytics for your business
          </p>
        </div>
        <Button className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh Analysis
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-indigo-50 to-white border-indigo-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Predicted Revenue (Next 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-700">$12,450</div>
            <p className="text-xs text-indigo-600 flex items-center mt-1">
              <TrendingUp className="w-3 h-3 mr-1" />
              +15% vs last week
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Efficiency Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">92/100</div>
            <p className="text-xs text-emerald-600 flex items-center mt-1">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Top 10% of similar businesses
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">At-Risk Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">14</div>
            <p className="text-xs text-amber-600 flex items-center mt-1">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Action required
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-violet-50 to-white border-violet-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">AI Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-violet-700">3</div>
            <p className="text-xs text-violet-600 flex items-center mt-1">
              <Zap className="w-3 h-3 mr-1" />
              New opportunities found
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue Forecast</CardTitle>
            <CardDescription>AI-predicted sales performance vs actuals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={predictionData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="actual" stroke="#94a3b8" strokeWidth={2} name="Actual Sales" />
                  <Line type="monotone" dataKey="predicted" stroke="#6366f1" strokeWidth={3} name="AI Prediction" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Generated Insights List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-indigo-500" />
              Smart Recommendations
            </CardTitle>
            <CardDescription>Actionable intelligence for today</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {insights.map((insight, idx) => {
              const Icon = insight.icon;
              return (
                <div key={idx} className="p-3 rounded-lg border bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-md ${
                        insight.type === 'action' ? 'bg-blue-100 text-blue-600' :
                        insight.type === 'warning' ? 'bg-amber-100 text-amber-600' :
                        'bg-slate-200 text-slate-600'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="font-semibold text-sm">{insight.title}</span>
                    </div>
                    <Badge variant="outline" className={
                      insight.impact === 'High' ? 'text-red-600 border-red-200 bg-red-50' : 'text-slate-600'
                    }>
                      {insight.impact} Impact
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600 mb-2">{insight.description}</p>
                  <Button variant="link" className="p-0 h-auto text-indigo-600 text-xs font-medium">
                    Take Action <ArrowRight className="w-3 h-3 ml-1" />
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
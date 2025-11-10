import { useEffect, useState } from "react";
import {
  Plus,
  Search,
  DollarSign,
  Calendar,
  FileText,
  Download,
  X,
  Filter,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import axios from "axios";

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [formData, setFormData] = useState({
    propertyId: "",
    category: "MAINTENANCE",
    amount: "",
    description: "",
    expenseDate: new Date().toISOString().split("T")[0],
    vendor: "",
    receiptNumber: "",
    paymentMethod: "CASH",
    isRecurring: false,
    recurringPeriod: "",
    notes: "",
  });

  useEffect(() => {
    fetchExpenses();
    fetchProperties();
  }, []);

  const fetchExpenses = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("/expenses", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = response.data.data || response.data;
      setExpenses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProperties = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("/properties", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data =
        response.data.data?.properties || response.data.data || response.data;
      setProperties(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching properties:", error);
    }
  };

  const handleOpenModal = (expense = null) => {
    if (expense) {
      setEditingExpense(expense);
      setFormData({
        propertyId: expense.propertyId || "",
        category: expense.category || "MAINTENANCE",
        amount: expense.amount || "",
        description: expense.description || "",
        expenseDate: expense.expenseDate
          ? new Date(expense.expenseDate).toISOString().split("T")[0]
          : "",
        vendor: expense.vendor || "",
        receiptNumber: expense.receiptNumber || "",
        paymentMethod: expense.paymentMethod || "CASH",
        isRecurring: expense.isRecurring || false,
        recurringPeriod: expense.recurringPeriod || "",
        notes: expense.notes || "",
      });
    } else {
      setEditingExpense(null);
      setFormData({
        propertyId: "",
        category: "MAINTENANCE",
        amount: "",
        description: "",
        expenseDate: new Date().toISOString().split("T")[0],
        vendor: "",
        receiptNumber: "",
        paymentMethod: "CASH",
        isRecurring: false,
        recurringPeriod: "",
        notes: "",
      });
    }
    setError("");
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingExpense(null);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const token = localStorage.getItem("token");
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
        propertyId: formData.propertyId || undefined,
      };

      if (editingExpense) {
        await axios.put(`/expenses/${editingExpense.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSuccess("Expense updated successfully");
      } else {
        await axios.post("/expenses", payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSuccess("Expense created successfully");
      }

      handleCloseModal();
      fetchExpenses();
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error("Error saving expense:", error);
      setError(error.response?.data?.error || "Failed to save expense");
    }
  };

  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch =
      expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.vendor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.category?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      filterCategory === "all" || expense.category === filterCategory;
    const matchesStatus =
      filterStatus === "all" || expense.status === filterStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "paid":
        return "default";
      case "pending":
        return "secondary";
      case "approved":
        return "outline";
      case "rejected":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      MAINTENANCE: "bg-blue-100 text-blue-800",
      UTILITIES: "bg-green-100 text-green-800",
      REPAIRS: "bg-orange-100 text-orange-800",
      INSURANCE: "bg-purple-100 text-purple-800",
      TAXES: "bg-red-100 text-red-800",
      SALARIES: "bg-yellow-100 text-yellow-800",
      MARKETING: "bg-pink-100 text-pink-800",
      OTHER: "bg-gray-100 text-gray-800",
    };
    return colors[category] || colors.OTHER;
  };

  const totalExpenses = expenses.reduce(
    (sum, exp) => sum + parseFloat(exp.amount || 0),
    0
  );
  const pendingExpenses = expenses.filter((e) => e.status === "PENDING").length;
  const thisMonthExpenses = expenses
    .filter((e) => {
      const expDate = new Date(e.expenseDate);
      const now = new Date();
      return (
        expDate.getMonth() === now.getMonth() &&
        expDate.getFullYear() === now.getFullYear()
      );
    })
    .reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-muted-foreground">Loading expenses...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground">
            Track property expenses and operational costs
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
          <Button onClick={() => handleOpenModal()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Expenses
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              KSh {totalExpenses.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              KSh {thisMonthExpenses.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Current month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Approval
            </CardTitle>
            <FileText className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingExpenses}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expenses.length}</div>
            <p className="text-xs text-muted-foreground">All expenses</p>
          </CardContent>
        </Card>
      </div>

      {showFilters && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-3">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 border rounded-md"
              >
                <option value="all">All Categories</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="UTILITIES">Utilities</option>
                <option value="REPAIRS">Repairs</option>
                <option value="INSURANCE">Insurance</option>
                <option value="TAXES">Taxes</option>
                <option value="SALARIES">Salaries</option>
                <option value="MARKETING">Marketing</option>
                <option value="OTHER">Other</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border rounded-md"
              >
                <option value="all">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="PAID">Paid</option>
                <option value="REJECTED">Rejected</option>
              </select>

              <Button
                variant="outline"
                onClick={() => {
                  setFilterCategory("all");
                  setFilterStatus("all");
                  setSearchTerm("");
                }}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search expenses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid gap-4">
        {filteredExpenses.map((expense) => (
          <Card key={expense.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={getCategoryColor(expense.category)}>
                      {expense.category}
                    </Badge>
                    <Badge variant={getStatusColor(expense.status)}>
                      {expense.status || "PENDING"}
                    </Badge>
                    {expense.isRecurring && (
                      <Badge variant="outline">Recurring</Badge>
                    )}
                  </div>
                  <h3 className="font-semibold text-lg mb-1">
                    {expense.description}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mt-3">
                    <div>
                      <span className="text-gray-500">Amount:</span>
                      <p className="font-semibold text-gray-900">
                        KSh {parseFloat(expense.amount || 0).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Date:</span>
                      <p className="font-medium">
                        {expense.expenseDate
                          ? new Date(expense.expenseDate).toLocaleDateString()
                          : "N/A"}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Vendor:</span>
                      <p className="font-medium">{expense.vendor || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Payment:</span>
                      <p className="font-medium">
                        {expense.paymentMethod || "N/A"}
                      </p>
                    </div>
                  </div>
                  {expense.notes && (
                    <p className="text-sm text-gray-600 mt-2">
                      <span className="font-medium">Notes:</span>{" "}
                      {expense.notes}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenModal(expense)}
                  >
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredExpenses.length === 0 && (
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground">No expenses found</p>
            <Button className="mt-4" onClick={() => handleOpenModal()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Expense
            </Button>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {editingExpense ? "Edit Expense" : "Add New Expense"}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={handleCloseModal}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded text-sm">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Category *
                    </label>
                    <select
                      required
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="MAINTENANCE">Maintenance</option>
                      <option value="UTILITIES">Utilities</option>
                      <option value="REPAIRS">Repairs</option>
                      <option value="INSURANCE">Insurance</option>
                      <option value="TAXES">Taxes</option>
                      <option value="SALARIES">Salaries</option>
                      <option value="MARKETING">Marketing</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Property
                    </label>
                    <select
                      value={formData.propertyId}
                      onChange={(e) =>
                        setFormData({ ...formData, propertyId: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="">General Expense</option>
                      {properties.map((property) => (
                        <option key={property.id} value={property.id}>
                          {property.title || property.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Description *
                  </label>
                  <Input
                    required
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="e.g., Plumbing repair for Unit 101"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Amount (KSh) *
                    </label>
                    <Input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) =>
                        setFormData({ ...formData, amount: e.target.value })
                      }
                      placeholder="e.g., 5000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Expense Date *
                    </label>
                    <Input
                      type="date"
                      required
                      value={formData.expenseDate}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          expenseDate: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Vendor
                    </label>
                    <Input
                      value={formData.vendor}
                      onChange={(e) =>
                        setFormData({ ...formData, vendor: e.target.value })
                      }
                      placeholder="e.g., ABC Plumbing Services"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Receipt Number
                    </label>
                    <Input
                      value={formData.receiptNumber}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          receiptNumber: e.target.value,
                        })
                      }
                      placeholder="e.g., RCP-12345"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Payment Method
                  </label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        paymentMethod: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="MPESA">M-Pesa</option>
                    <option value="CARD">Card</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isRecurring"
                    checked={formData.isRecurring}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        isRecurring: e.target.checked,
                      })
                    }
                    className="rounded"
                  />
                  <label htmlFor="isRecurring" className="text-sm font-medium">
                    Recurring Expense
                  </label>
                </div>

                {formData.isRecurring && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Recurring Period
                    </label>
                    <select
                      value={formData.recurringPeriod}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          recurringPeriod: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="">Select Period</option>
                      <option value="MONTHLY">Monthly</option>
                      <option value="QUARTERLY">Quarterly</option>
                      <option value="YEARLY">Yearly</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-md"
                    rows="3"
                    placeholder="Additional notes..."
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">
                    {editingExpense ? "Update Expense" : "Create Expense"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseModal}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Expenses;

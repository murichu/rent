import { useEffect, useState } from "react";
import {
  FileText,
  Search,
  Plus,
  Calendar,
  DollarSign,
  Download,
  Send,
  Filter,
  X,
  User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "../config/api";

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [leases, setLeases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");

  const [formData, setFormData] = useState({
    leaseId: "",
    amount: "",
    periodYear: new Date().getFullYear().toString(),
    periodMonth: (new Date().getMonth() + 1).toString(),
    issuedAt: new Date().toISOString().split("T")[0],
    dueAt: "",
  });

  useEffect(() => {
    fetchInvoices();
    fetchLeases();
  }, []);

  const fetchInvoices = async () => {
    try {
      const response = await apiClient.get("/invoices");
      const invoicesData =
        response.data?.data?.invoices ||
        response.data?.invoices ||
        response.data?.data ||
        response.data ||
        [];
      setInvoices(Array.isArray(invoicesData) ? invoicesData : []);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      setError("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  const fetchLeases = async () => {
    try {
      const response = await apiClient.get("/leases");
      const leasesData =
        response.data?.data?.leases ||
        response.data?.leases ||
        response.data?.data ||
        response.data ||
        [];
      setLeases(Array.isArray(leasesData) ? leasesData : []);
    } catch (error) {
      console.error("Error fetching leases:", error);
    }
  };

  const handleOpenModal = (invoice = null) => {
    if (invoice) {
      setEditingInvoice(invoice);
      setFormData({
        leaseId: invoice.leaseId || "",
        amount: invoice.amount?.toString() || "",
        periodYear:
          invoice.periodYear?.toString() || new Date().getFullYear().toString(),
        periodMonth:
          invoice.periodMonth?.toString() ||
          (new Date().getMonth() + 1).toString(),
        issuedAt: invoice.issuedAt
          ? new Date(invoice.issuedAt).toISOString().split("T")[0]
          : "",
        dueAt: invoice.dueAt
          ? new Date(invoice.dueAt).toISOString().split("T")[0]
          : "",
      });
    } else {
      setEditingInvoice(null);
      setFormData({
        leaseId: "",
        amount: "",
        periodYear: new Date().getFullYear().toString(),
        periodMonth: (new Date().getMonth() + 1).toString(),
        issuedAt: new Date().toISOString().split("T")[0],
        dueAt: "",
      });
    }
    setError("");
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingInvoice(null);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const payload = {
        ...formData,
        amount: parseInt(formData.amount),
        periodYear: parseInt(formData.periodYear),
        periodMonth: parseInt(formData.periodMonth),
      };

      if (editingInvoice) {
        await apiClient.put(`/invoices/${editingInvoice.id}`, payload);
        setSuccess("Invoice updated successfully");
      } else {
        await apiClient.post("/invoices", payload);
        setSuccess("Invoice created successfully");
      }
      handleCloseModal();
      fetchInvoices();
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error("Error saving invoice:", error);
      setError(error.response?.data?.error || "Failed to save invoice");
    }
  };

  const handleDelete = async (invoice) => {
    if (!window.confirm("Are you sure you want to delete this invoice?")) {
      return;
    }

    try {
      await apiClient.delete(`/invoices/${invoice.id}`);
      setSuccess("Invoice deleted successfully");
      fetchInvoices();
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error("Error deleting invoice:", error);
      setError(error.response?.data?.error || "Failed to delete invoice");
      setTimeout(() => setError(""), 3000);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      PENDING: "secondary",
      PARTIAL: "warning",
      PAID: "default",
      OVERDUE: "destructive",
    };
    return variants[status] || "secondary";
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch = invoice.id
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterStatus === "all" || invoice.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-muted-foreground">Loading invoices...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
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

      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            Invoices
          </h1>
          <p className="text-lg text-gray-600">
            Manage rent invoices and billing
          </p>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>{filteredInvoices.length} invoices</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button onClick={() => handleOpenModal()}>
            <Plus className="h-4 w-4 mr-2" />
            Create Invoice
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="relative max-w-2xl">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search invoices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-12"
          />
        </div>

        {showFilters && (
          <Card className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="all">All Status</option>
                  <option value="PENDING">Pending</option>
                  <option value="PARTIAL">Partial</option>
                  <option value="PAID">Paid</option>
                  <option value="OVERDUE">Overdue</option>
                </select>
              </div>
            </div>
          </Card>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredInvoices.map((invoice) => (
          <Card key={invoice.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      KSh {invoice.amount?.toLocaleString()}
                    </CardTitle>
                    <Badge
                      variant={getStatusBadge(invoice.status)}
                      className="mt-1"
                    >
                      {invoice.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center text-sm text-gray-600">
                <Calendar className="h-4 w-4 mr-2" />
                Period: {invoice.periodMonth}/{invoice.periodYear}
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Calendar className="h-4 w-4 mr-2" />
                Due: {new Date(invoice.dueAt).toLocaleDateString()}
              </div>
              {invoice.totalPaid > 0 && (
                <div className="flex items-center text-sm text-gray-600">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Paid: KSh {invoice.totalPaid?.toLocaleString()}
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenModal(invoice)}
                  className="flex-1"
                >
                  Edit
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <Download className="h-4 w-4 mr-1" />
                  PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredInvoices.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No invoices found
          </h3>
          <p className="text-gray-600 mb-8">
            {searchTerm || filterStatus !== "all"
              ? "Try adjusting your filters"
              : "Get started by creating your first invoice"}
          </p>
          <Button onClick={() => handleOpenModal()}>
            <Plus className="mr-2 h-4 w-4" />
            Create Invoice
          </Button>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">
                {editingInvoice ? "Edit Invoice" : "Create Invoice"}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lease *
                </label>
                <select
                  value={formData.leaseId}
                  onChange={(e) =>
                    setFormData({ ...formData, leaseId: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select Lease</option>
                  {leases.map((lease) => (
                    <option key={lease.id} value={lease.id}>
                      Lease {lease.id.slice(0, 8)}...
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (KSh) *
                </label>
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Period Month *
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="12"
                    value={formData.periodMonth}
                    onChange={(e) =>
                      setFormData({ ...formData, periodMonth: e.target.value })
                    }
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Period Year *
                  </label>
                  <Input
                    type="number"
                    value={formData.periodYear}
                    onChange={(e) =>
                      setFormData({ ...formData, periodYear: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Issued Date *
                </label>
                <Input
                  type="date"
                  value={formData.issuedAt}
                  onChange={(e) =>
                    setFormData({ ...formData, issuedAt: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date *
                </label>
                <Input
                  type="date"
                  value={formData.dueAt}
                  onChange={(e) =>
                    setFormData({ ...formData, dueAt: e.target.value })
                  }
                  required
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseModal}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  {editingInvoice ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoices;

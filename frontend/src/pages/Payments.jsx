import { useEffect, useState } from "react";
import {
  DollarSign,
  Search,
  Plus,
  Calendar,
  FileText,
  Filter,
  X,
  Download,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "../config/api";

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [leases, setLeases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterMethod, setFilterMethod] = useState("all");
  const [activeTab, setActiveTab] = useState("payments");

  const [formData, setFormData] = useState({
    leaseId: "",
    amount: "",
    paidAt: new Date().toISOString().split("T")[0],
    method: "MANUAL",
    referenceNumber: "",
    notes: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [paymentsRes, invoicesRes, leasesRes] = await Promise.all([
        apiClient.get("/payments"),
        apiClient.get("/invoices"),
        apiClient.get("/leases"),
      ]);

      const paymentsData =
        paymentsRes.data?.data?.payments ||
        paymentsRes.data?.payments ||
        paymentsRes.data?.data ||
        paymentsRes.data ||
        [];
      const invoicesData =
        invoicesRes.data?.data?.invoices ||
        invoicesRes.data?.invoices ||
        invoicesRes.data?.data ||
        invoicesRes.data ||
        [];
      const leasesData =
        leasesRes.data?.data?.leases ||
        leasesRes.data?.leases ||
        leasesRes.data?.data ||
        leasesRes.data ||
        [];

      setPayments(Array.isArray(paymentsData) ? paymentsData : []);
      setInvoices(Array.isArray(invoicesData) ? invoicesData : []);
      setLeases(Array.isArray(leasesData) ? leasesData : []);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (payment = null) => {
    if (payment) {
      setEditingPayment(payment);
      setFormData({
        leaseId: payment.leaseId || "",
        amount: payment.amount?.toString() || "",
        paidAt: payment.paidAt
          ? new Date(payment.paidAt).toISOString().split("T")[0]
          : "",
        method: payment.method || "MANUAL",
        referenceNumber: payment.referenceNumber || "",
        notes: payment.notes || "",
      });
    } else {
      setEditingPayment(null);
      setFormData({
        leaseId: "",
        amount: "",
        paidAt: new Date().toISOString().split("T")[0],
        method: "MANUAL",
        referenceNumber: "",
        notes: "",
      });
    }
    setError("");
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPayment(null);
    setFormData({
      leaseId: "",
      amount: "",
      paidAt: new Date().toISOString().split("T")[0],
      method: "MANUAL",
      referenceNumber: "",
      notes: "",
    });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const payload = {
        ...formData,
        amount: parseInt(formData.amount),
      };

      if (editingPayment) {
        await apiClient.put(`/payments/${editingPayment.id}`, payload);
        setSuccess("Payment updated successfully");
      } else {
        await apiClient.post("/payments", payload);
        setSuccess("Payment recorded successfully");
      }
      handleCloseModal();
      fetchData();
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error("Error saving payment:", error);
      setError(error.response?.data?.error || "Failed to save payment");
    }
  };

  const getPaymentMethodBadge = (method) => {
    const variants = {
      MPESA_C2B: "default",
      MANUAL: "secondary",
      BANK_TRANSFER: "outline",
      CASH: "secondary",
      PESAPAL: "default",
      CARD: "outline",
    };
    return variants[method] || "secondary";
  };

  const getInvoiceStatusBadge = (status) => {
    const variants = {
      PENDING: "secondary",
      PARTIAL: "warning",
      PAID: "default",
      OVERDUE: "destructive",
    };
    return variants[status] || "secondary";
  };

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.referenceNumber
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      payment.notes?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesMethod =
      filterMethod === "all" || payment.method === filterMethod;

    return matchesSearch && matchesMethod;
  });

  const filteredInvoices = invoices.filter((invoice) => {
    return invoice.leaseId?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-muted-foreground">Loading payments...</div>
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
            Payments & Invoices
          </h1>
          <p className="text-lg text-gray-600">
            Track payments and manage invoices
          </p>
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
            Record Payment
          </Button>
        </div>
      </div>

      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab("payments")}
          className={`px-4 py-2 font-medium ${
            activeTab === "payments"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Payments ({filteredPayments.length})
        </button>
        <button
          onClick={() => setActiveTab("invoices")}
          className={`px-4 py-2 font-medium ${
            activeTab === "invoices"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Invoices ({filteredInvoices.length})
        </button>
      </div>

      <div className="space-y-4">
        <div className="relative max-w-2xl">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search payments or invoices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-12"
          />
        </div>

        {showFilters && activeTab === "payments" && (
          <Card className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                <select
                  value={filterMethod}
                  onChange={(e) => setFilterMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="all">All Methods</option>
                  <option value="MPESA_C2B">M-Pesa</option>
                  <option value="MANUAL">Manual</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CASH">Cash</option>
                  <option value="PESAPAL">PesaPal</option>
                  <option value="CARD">Card</option>
                </select>
              </div>
            </div>
          </Card>
        )}
      </div>

      {activeTab === "payments" && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredPayments.map((payment) => (
            <Card
              key={payment.id}
              className="hover:shadow-lg transition-shadow"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        KSh {payment.amount?.toLocaleString()}
                      </CardTitle>
                      <Badge
                        variant={getPaymentMethodBadge(payment.method)}
                        className="mt-1"
                      >
                        {payment.method}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="h-4 w-4 mr-2" />
                  {new Date(payment.paidAt).toLocaleDateString()}
                </div>
                {payment.referenceNumber && (
                  <div className="flex items-center text-sm text-gray-600">
                    <FileText className="h-4 w-4 mr-2" />
                    Ref: {payment.referenceNumber}
                  </div>
                )}
                {payment.notes && (
                  <div className="text-sm text-gray-600 line-clamp-2">
                    {payment.notes}
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenModal(payment)}
                    className="flex-1"
                  >
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeTab === "invoices" && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredInvoices.map((invoice) => (
            <Card
              key={invoice.id}
              className="hover:shadow-lg transition-shadow"
            >
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
                        variant={getInvoiceStatusBadge(invoice.status)}
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
                  <Button variant="outline" size="sm" className="flex-1">
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {((activeTab === "payments" && filteredPayments.length === 0) ||
        (activeTab === "invoices" && filteredInvoices.length === 0)) && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          {activeTab === "payments" ? (
            <DollarSign className="h-16 w-16 text-gray-400 mb-4" />
          ) : (
            <FileText className="h-16 w-16 text-gray-400 mb-4" />
          )}
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No {activeTab} found
          </h3>
          <p className="text-gray-600 mb-8">
            {searchTerm || filterMethod !== "all"
              ? "Try adjusting your filters"
              : `Get started by ${
                  activeTab === "payments"
                    ? "recording your first payment"
                    : "creating your first invoice"
                }`}
          </p>
          {activeTab === "payments" && (
            <Button onClick={() => handleOpenModal()}>
              <Plus className="mr-2 h-4 w-4" />
              Record Payment
            </Button>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">
                {editingPayment ? "Edit Payment" : "Record Payment"}
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Date *
                </label>
                <Input
                  type="date"
                  value={formData.paidAt}
                  onChange={(e) =>
                    setFormData({ ...formData, paidAt: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method *
                </label>
                <select
                  value={formData.method}
                  onChange={(e) =>
                    setFormData({ ...formData, method: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="MANUAL">Manual</option>
                  <option value="MPESA_C2B">M-Pesa</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CASH">Cash</option>
                  <option value="PESAPAL">PesaPal</option>
                  <option value="CARD">Card</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reference Number
                </label>
                <Input
                  value={formData.referenceNumber}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      referenceNumber: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows="3"
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
                  {editingPayment ? "Update" : "Record"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;

'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Customer {
  id: string;
  displayName: string;
  primaryPhone: string;
  email: string | null;
  location: string | null;
  tags: string[];
  optedIn: boolean;
  activePolicy?: {
    id: string;
    policyNumber: string;
    status: string;
  } | null;
}

export default function CustomersIndexPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'opted_in' | 'no_consent' | 'no_email' | 'active_policy'>('all');

  // Modal State for + Add Customer
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [actionNotification, setActionNotification] = useState<string | null>(null);

  // Fetch list of customers
  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/customers');
      if (!res.ok) throw new Error('Failed to load customers');
      return res.json();
    },
  });

  // Dynamic summary metrics
  const totalCount = customers.length;
  const optedInCount = customers.filter((c) => c.optedIn).length;
  const noConsentCount = customers.filter((c) => !c.optedIn).length;
  const activePolicyCount = customers.filter((c) => !!c.activePolicy).length;
  const noEmailCount = customers.filter(
    (c) => !c.email || c.email.trim() === '' || c.email === 'No email registered'
  ).length;

  // Filter customers by display name or phone, plus filter tabs
  const filteredCustomers = customers.filter((c) => {
    // 1. Search Query Filter
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      c.displayName.toLowerCase().includes(query) ||
      c.primaryPhone.includes(query) ||
      (c.email && c.email.toLowerCase().includes(query));

    if (!matchesSearch) return false;

    // 2. Tab Filter
    if (filterTab === 'opted_in') return c.optedIn;
    if (filterTab === 'no_consent') return !c.optedIn;
    if (filterTab === 'no_email') return !c.email || c.email.trim() === '' || c.email === 'No email registered';
    if (filterTab === 'active_policy') return !!c.activePolicy;

    return true;
  });

  // Add Customer Mutation
  const createCustomerMutation = useMutation({
    mutationFn: async (payload: { displayName: string; phone: string; email?: string }) => {
      const res = await fetch('/api/dashboard/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: payload.displayName,
          phone: payload.phone,
          source: 'DIRECT_ADD',
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to add customer');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setIsAddModalOpen(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
      setNewCustomerEmail('');
      showFeedback('Customer added successfully!');
    },
    onError: (err: any) => {
      showFeedback(err.message || 'Error adding customer');
    },
  });

  const showFeedback = (msg: string) => {
    setActionNotification(msg);
    setTimeout(() => setActionNotification(null), 4000);
  };

  const handleAddCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim() || !newCustomerPhone.trim()) return;
    createCustomerMutation.mutate({
      displayName: newCustomerName.trim(),
      phone: newCustomerPhone.trim(),
      email: newCustomerEmail.trim() || undefined,
    });
  };

  // CSV Export handler
  const handleExport = () => {
    if (filteredCustomers.length === 0) return;
    const headers = ['Name', 'Phone', 'Email', 'Location', 'Opted In', 'Tags', 'Active Policy'];
    const rows = filteredCustomers.map((c) => [
      `"${c.displayName.replace(/"/g, '""')}"`,
      `"${c.primaryPhone}"`,
      `"${c.email || ''}"`,
      `"${c.location || ''}"`,
      c.optedIn ? 'Yes' : 'No',
      `"${c.tags?.join(', ') || ''}"`,
      `"${c.activePolicy?.policyNumber || 'None'}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `customers_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showFeedback(`Exported ${filteredCustomers.length} customer records to CSV.`);
  };

  // Clean Initials helper
  const getInitials = (name: string, phone: string) => {
    const trimmed = name?.trim();
    if (!trimmed || trimmed === '.') return '.';
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return trimmed.slice(0, 2).toUpperCase();
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 font-sans text-gray-900 space-y-6 pb-12">
      {/* Toast Feedback */}
      {actionNotification && (
        <div className="fixed top-5 right-6 px-4 py-2.5 rounded-xl shadow-lg z-50 flex items-center gap-2 border border-gray-200 bg-white font-semibold text-xs text-gray-800 animate-in fade-in slide-in-from-top-2 duration-150">
          <span className="material-symbols-outlined text-[17px] text-blue-600">info</span>
          <span>{actionNotification}</span>
        </div>
      )}

      {/* 1. PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
            Customers Directory
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Manage and monitor customer records, consent status, and WhatsApp contact pipelines.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[17px] pointer-events-none">
              search
            </span>
            <input
              id="customer-search"
              name="customerSearch"
              aria-label="Search customers"
              type="text"
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white border border-gray-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 w-56 sm:w-64 transition-all"
            />
          </div>

          <button
            type="button"
            onClick={handleExport}
            className="border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-2xs transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            <span>Export</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="bg-[#004ac6] hover:bg-[#003cb0] text-white text-xs font-semibold px-3.5 py-1.5 rounded-xl shadow-xs flex items-center gap-1 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* 2. SUMMARY CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Contacts */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
              Total Contacts
            </span>
            <span className="text-2xl font-bold text-gray-900 mt-1 block">
              {totalCount}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#004ac6] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">group</span>
          </div>
        </div>

        {/* Opted In */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
              Opted In
            </span>
            <span className="text-2xl font-bold text-gray-900 mt-1 block">
              {optedInCount}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
          </div>
        </div>

        {/* Active Policies */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
              Active Policies
            </span>
            <span className="text-2xl font-bold text-gray-900 mt-1 block">
              {activePolicyCount}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">description</span>
          </div>
        </div>

        {/* No Email Registered */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
              No Email Registered
            </span>
            <span className="text-2xl font-bold text-gray-900 mt-1 block">
              {noEmailCount}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">mail</span>
          </div>
        </div>
      </div>

      {/* 3. FILTER ROW */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none py-0.5">
        {[
          { key: 'all', label: 'All Contacts', count: totalCount },
          { key: 'opted_in', label: 'Opted In', count: optedInCount },
          { key: 'no_consent', label: 'No Consent', count: noConsentCount },
          { key: 'no_email', label: 'No Email', count: noEmailCount },
          { key: 'active_policy', label: 'Active Policy', count: activePolicyCount },
        ].map((tab) => {
          const isActive = filterTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilterTab(tab.key as any)}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer',
                isActive
                  ? 'bg-[#004ac6] text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/70'
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
                  isActive ? 'bg-white/20 text-white' : 'text-gray-400'
                )}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 4. CUSTOMER TABLE CONTAINER */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-gray-400 animate-pulse">
              Loading customers...
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="p-12 text-center text-xs text-gray-400">
              No customers found matching your criteria.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/70 border-b border-gray-200">
                  <th className="px-6 py-3.5 font-bold text-gray-500 uppercase tracking-wider text-[11px]">
                    Name
                  </th>
                  <th className="px-6 py-3.5 font-bold text-gray-500 uppercase tracking-wider text-[11px]">
                    Phone / Identifier
                  </th>
                  <th className="px-6 py-3.5 font-bold text-gray-500 uppercase tracking-wider text-[11px]">
                    Location
                  </th>
                  <th className="px-6 py-3.5 font-bold text-gray-500 uppercase tracking-wider text-[11px]">
                    Tags
                  </th>
                  <th className="px-6 py-3.5 font-bold text-gray-500 uppercase tracking-wider text-[11px]">
                    Active Policy
                  </th>
                  <th className="px-6 py-3.5 font-bold text-gray-500 uppercase tracking-wider text-[11px] text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCustomers.map((customer) => {
                  const initials = getInitials(customer.displayName, customer.primaryPhone);

                  return (
                    <tr key={customer.id} className="hover:bg-gray-50/60 transition-colors">
                      {/* Name Column */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 border border-blue-200/60 flex items-center justify-center font-bold text-xs shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/dashboard/customers/${customer.id}`}
                              className="font-bold text-xs text-gray-900 hover:text-blue-600 transition-colors truncate block"
                            >
                              {customer.displayName}
                            </Link>
                            <div className="text-[11px] text-gray-400 font-normal mt-0.5 truncate">
                              {customer.email || 'No email registered'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Phone / Identifier Column */}
                      <td className="px-6 py-4 font-semibold text-gray-800">
                        <div>{customer.primaryPhone}</div>
                        <div className="text-[11px] font-medium mt-0.5 flex items-center gap-1.5">
                          <span
                            className={cn(
                              'w-1.5 h-1.5 rounded-full',
                              customer.optedIn ? 'bg-emerald-500' : 'bg-gray-400'
                            )}
                          />
                          <span className={customer.optedIn ? 'text-emerald-600' : 'text-gray-500'}>
                            {customer.optedIn ? 'Opted In' : 'No Consent'}
                          </span>
                        </div>
                      </td>

                      {/* Location Column */}
                      <td className="px-6 py-4 font-medium text-gray-600">
                        {customer.location === 'Redacted' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                            Redacted
                          </span>
                        ) : customer.location ? (
                          <span>{customer.location}</span>
                        ) : (
                          <span className="text-gray-300 font-normal">—</span>
                        )}
                      </td>

                      {/* Tags Column */}
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1 items-center">
                          {customer.tags && customer.tags.length > 0 ? (
                            customer.tags.map((tag) => (
                              <span
                                key={tag}
                                className={cn(
                                  'px-2 py-0.5 rounded text-[10px] font-semibold border',
                                  tag === 'Privacy Deleted'
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : 'bg-gray-100 text-gray-600 border-gray-200'
                                )}
                              >
                                {tag}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-300 font-normal">—</span>
                          )}
                        </div>
                      </td>

                      {/* Active Policy Column */}
                      <td className="px-6 py-4">
                        {customer.activePolicy ? (
                          <div>
                            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                              {customer.activePolicy.policyNumber}
                            </span>
                            <div className="text-[10px] text-gray-400 font-medium mt-0.5">
                              Status: {customer.activePolicy.status}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 font-normal">No Active Policy</span>
                        )}
                      </td>

                      {/* Actions Column */}
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/dashboard/customers/${customer.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#004ac6] hover:bg-[#003cb0] text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                        >
                          <span className="material-symbols-outlined text-[15px]">visibility</span>
                          <span>View Profile</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ADD CUSTOMER MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md shadow-xl overflow-hidden flex flex-col">
            <header className="px-5 py-3.5 bg-gray-50/80 border-b border-gray-200 flex items-center justify-between shrink-0">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-800">
                Add New Customer
              </span>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-gray-200/60 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </header>

            <form onSubmit={handleAddCustomerSubmit} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                  Phone Number
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. +14155552671"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  placeholder="e.g. customer@example.com"
                  value={newCustomerEmail}
                  onChange={(e) => setNewCustomerEmail(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
                />
              </div>

              <footer className="pt-3 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createCustomerMutation.isPending}
                  className="px-4 py-2 bg-[#004ac6] hover:bg-[#003cb0] text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
                >
                  {createCustomerMutation.isPending ? 'Saving...' : 'Add Customer'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

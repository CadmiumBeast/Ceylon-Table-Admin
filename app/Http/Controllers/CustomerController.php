<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CustomerController extends Controller
{
    public function index(): Response
    {
        $customers = User::query()
            ->where('type', 'customer')
            ->with('customer')
            ->latest()
            ->get()
            ->map(fn(User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'created_at' => $user->created_at,
                'customer' => $user->customer ? [
                    'first_name' => $user->customer->first_name,
                    'last_name' => $user->customer->last_name,
                    'phone_number' => $user->customer->phone_number,
                    'address' => $user->customer->address,
                    'date_of_birth' => $user->customer->date_of_birth,
                    'loyalty_points' => $user->customer->loyalty_points,
                ] : null,
            ]);

        return Inertia::render('customers/index', [
            'customers' => $customers,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('customers/create');
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'phone_number' => ['required', 'string', 'max:20', 'unique:customers,phone_number'],
            'address' => ['nullable', 'string'],
            'date_of_birth' => ['nullable', 'date'],
        ]);

        DB::transaction(function () use ($validated): void {
            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => $validated['password'],
                'type' => 'customer',
            ]);

            Customer::create([
                'user_id' => $user->id,
                'first_name' => $validated['first_name'],
                'last_name' => $validated['last_name'],
                'phone_number' => $validated['phone_number'],
                'address' => $validated['address'] ?? null,
                'date_of_birth' => $validated['date_of_birth'] ?? null,
            ]);
        });

        return to_route('customers.index')->with('success', 'Customer created successfully.');
    }

    public function edit(User $customer): Response
    {
        abort_if($customer->type !== 'customer', 404);

        $customer->load('customer');

        return Inertia::render('customers/edit', [
            'customer' => [
                'id' => $customer->id,
                'name' => $customer->name,
                'email' => $customer->email,
                'customer' => $customer->customer ? [
                    'first_name' => $customer->customer->first_name,
                    'last_name' => $customer->customer->last_name,
                    'phone_number' => $customer->customer->phone_number,
                    'address' => $customer->customer->address,
                    'date_of_birth' => $customer->customer->date_of_birth,
                ] : null,
            ],
        ]);
    }

    public function update(Request $request, User $customer): RedirectResponse
    {
        abort_if($customer->type !== 'customer', 404);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($customer->id)],
            'password' => ['nullable', 'string', 'min:8', 'confirmed'],
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'phone_number' => [
                'required',
                'string',
                'max:20',
                Rule::unique('customers', 'phone_number')->ignore($customer->customer?->id),
            ],
            'address' => ['nullable', 'string'],
            'date_of_birth' => ['nullable', 'date'],
        ]);

        DB::transaction(function () use ($validated, $customer): void {
            $updateData = [
                'name' => $validated['name'],
                'email' => $validated['email'],
            ];

            if (! empty($validated['password'])) {
                $updateData['password'] = $validated['password'];
            }

            $customer->update($updateData);

            $customer->customer()->updateOrCreate(
                ['user_id' => $customer->id],
                [
                    'first_name' => $validated['first_name'],
                    'last_name' => $validated['last_name'],
                    'phone_number' => $validated['phone_number'],
                    'address' => $validated['address'] ?? null,
                    'date_of_birth' => $validated['date_of_birth'] ?? null,
                ]
            );
        });

        return to_route('customers.index')->with('success', 'Customer updated successfully.');
    }

    public function destroy(User $customer): RedirectResponse
    {
        abort_if($customer->type !== 'customer', 404);

        $customer->delete();

        return to_route('customers.index')->with('success', 'Customer deleted successfully.');
    }
}

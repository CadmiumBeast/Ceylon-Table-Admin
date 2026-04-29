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

class UserController extends Controller
{
    public function index(): Response
    {
        $users = User::query()
            ->with('customer')
            ->latest()
            ->get()
            ->map(function (User $user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'type' => $user->type,
                    'created_at' => $user->created_at,
                    'updated_at' => $user->updated_at,
                    'customer' => $user->customer ? [
                        'first_name' => $user->customer->first_name,
                        'last_name' => $user->customer->last_name,
                        'phone_number' => $user->customer->phone_number,
                        'address' => $user->customer->address,
                        'date_of_birth' => $user->customer->date_of_birth,
                    ] : null,
                ];
            });

        return Inertia::render('users/index', [
            'users' => $users,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('users/create');
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'type' => ['required', Rule::in(['customer', 'admin', 'chef', 'staff'])],
            'first_name' => ['required_if:type,customer', 'nullable', 'string', 'max:255'],
            'last_name' => ['required_if:type,customer', 'nullable', 'string', 'max:255'],
            'phone_number' => ['required_if:type,customer', 'nullable', 'string', 'max:20', 'unique:customers,phone_number'],
            'address' => ['nullable', 'string'],
            'date_of_birth' => ['nullable', 'date'],
        ]);

        DB::transaction(function () use ($validated): void {
            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => $validated['password'],
                'type' => $validated['type'],
            ]);

            if ($validated['type'] === 'customer') {
                Customer::create([
                    'user_id' => $user->id,
                    'first_name' => $validated['first_name'] ?? '',
                    'last_name' => $validated['last_name'] ?? '',
                    'phone_number' => $validated['phone_number'] ?? '',
                    'address' => $validated['address'] ?? null,
                    'date_of_birth' => $validated['date_of_birth'] ?? null,
                ]);
            }
        });

        return to_route('users.index')->with('success', 'User created successfully.');
    }

    public function edit(User $user): Response
    {
        $user->load('customer');

        return Inertia::render('users/edit', [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'type' => $user->type,
                'customer' => $user->customer ? [
                    'first_name' => $user->customer->first_name,
                    'last_name' => $user->customer->last_name,
                    'phone_number' => $user->customer->phone_number,
                    'address' => $user->customer->address,
                    'date_of_birth' => $user->customer->date_of_birth,
                ] : null,
            ],
        ]);
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => ['nullable', 'string', 'min:8', 'confirmed'],
            'type' => ['required', Rule::in(['customer', 'admin', 'chef', 'staff'])],
            'first_name' => ['required_if:type,customer', 'nullable', 'string', 'max:255'],
            'last_name' => ['required_if:type,customer', 'nullable', 'string', 'max:255'],
            'phone_number' => [
                'required_if:type,customer',
                'nullable',
                'string',
                'max:20',
                Rule::unique('customers', 'phone_number')->ignore($user->customer?->id),
            ],
            'address' => ['nullable', 'string'],
            'date_of_birth' => ['nullable', 'date'],
        ]);

        DB::transaction(function () use ($validated, $user): void {
            $updateData = [
                'name' => $validated['name'],
                'email' => $validated['email'],
                'type' => $validated['type'],
            ];

            if (! empty($validated['password'])) {
                $updateData['password'] = $validated['password'];
            }

            $user->update($updateData);

            if ($validated['type'] === 'customer') {
                $user->customer()->updateOrCreate(
                    ['user_id' => $user->id],
                    [
                        'first_name' => $validated['first_name'] ?? '',
                        'last_name' => $validated['last_name'] ?? '',
                        'phone_number' => $validated['phone_number'] ?? '',
                        'address' => $validated['address'] ?? null,
                        'date_of_birth' => $validated['date_of_birth'] ?? null,
                    ]
                );
            } else {
                $user->customer()?->delete();
            }
        });

        return to_route('users.index')->with('success', 'User updated successfully.');
    }


    public function destroy(User $user): RedirectResponse
    {
        $user->delete();

        return to_route('users.index')->with('success', 'User deleted successfully.');
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class AuthController extends Controller
{
    public function signup(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'type' => ['nullable', Rule::in(['customer', 'admin', 'chef', 'staff'])],
            'first_name' => ['required_if:type,customer', 'nullable', 'string', 'max:255'],
            'last_name' => ['required_if:type,customer', 'nullable', 'string', 'max:255'],
            'phone_number' => ['required_if:type,customer', 'nullable', 'string', 'max:20', 'unique:customers,phone_number'],
            'address' => ['nullable', 'string'],
            'date_of_birth' => ['nullable', 'date'],
        ]);

        $user = DB::transaction(function () use ($validated): User {
            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'type' => $validated['type'] ?? 'customer',
            ]);

            if (($validated['type'] ?? 'customer') === 'customer') {
                Customer::create([
                    'user_id' => $user->id,
                    'first_name' => $validated['first_name'] ?? '',
                    'last_name' => $validated['last_name'] ?? '',
                    'phone_number' => $validated['phone_number'] ?? '',
                    'address' => $validated['address'] ?? null,
                    'date_of_birth' => $validated['date_of_birth'] ?? null,
                ]);
            }

            return $user->load('customer');
        });

        $token = $user->createToken('flutter')->plainTextToken;

        return response()->json([
            'message' => 'Signup successful.',
            'token_type' => 'Bearer',
            'token' => $token,
            'user' => $this->formatUser($user),
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'username' => ['nullable', 'string', 'required_without:phone_number'],
            'password' => ['required', 'string'],
        ]);

        $userQuery = User::query()->with('customer')->where(function ($query) use ($credentials) {
            $query->where('name', $credentials['username'])
                ->orWhere('email', $credentials['username'])
                ->orWhereHas('customer', function ($customerQuery) use ($credentials) {
                    $customerQuery->where('phone_number', $credentials['username']);
                });
        });

        $user = $userQuery->first();

        if (! $user) {
            return response()->json([
                'message' => 'User not found.',
            ], 401);
        }

        if (! Hash::check($credentials['password'], $user->password)) {
            return response()->json([
                'message' => 'Invalid password.',
            ], 401);
        }

        $token = $user->createToken('flutter')->plainTextToken;

        return response()->json([
            'message' => 'Login successful.',
            'token_type' => 'Bearer',
            'token' => $token,
            'user' => $this->formatUser($user),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('customer');

        return response()->json([
            'user' => $this->formatUser($user),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }

    private function formatUser(User $user): array
    {
        return [
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
        ];
    }

    //Delete user account
    public function deleteAccount(Request $request): JsonResponse
    {
        $user = $request->user();

        // Delete the associated customer record if it exists
        if ($user->customer) {
            $user->customer->delete();
        }

        // Delete the user account
        $user->delete();

        return response()->json([
            'message' => 'User account deleted successfully.',
        ]);
    }
}

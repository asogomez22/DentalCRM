<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $clinicId = app('currentClinic')->id;

        $users = User::query()
            ->where('clinic_id', $clinicId)
            ->where('is_active', true)
            ->when($request->filled('role'), function ($query) use ($request) {
                $query->where('role', $request->input('role'));
            })
            ->orderBy('name')
            ->get()
            ->map(function (User $user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                ];
            });

        return response()->json($users);
    }

    public function publicDentists(): JsonResponse
    {
        $clinicId = app('currentClinic')->id;

        $dentists = User::query()
            ->where('clinic_id', $clinicId)
            ->where('role', 'dentist')
            ->where('is_active', true)
            ->orderBy('name')
            ->get()
            ->map(function (User $user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                ];
            });

        return response()->json($dentists);
    }
}

<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class UserAccess
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, $type): Response
    {
        $allowedTypes = array_map('trim', explode(',', (string) $type));

        if (in_array(auth()->user()->type, $allowedTypes, true)) {
            return $next($request);
        }

        return redirect()->back()->with('error', 'No access');
    }
}

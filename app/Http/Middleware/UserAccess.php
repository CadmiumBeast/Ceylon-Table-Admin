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
        if (auth()->user()->type == $type) {
            return $next($request);
        }

        return redirect()->back()->with('error', 'No access');
    }
}

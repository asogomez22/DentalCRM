<?php

namespace App\Http\Controllers;

use App\Models\Document;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class DocumentController extends Controller
{
    public function index(Request $request)
    {
        $documents = Document::query()
            ->with(['patient:id,first_name,last_name', 'uploadedBy:id,name'])
            ->when($request->filled('patient_id'), fn ($query) => $query->where('patient_id', $request->integer('patient_id')))
            ->when($request->filled('category'), fn ($query) => $query->where('category', $request->input('category')))
            ->latest('id')
            ->get();

        return response()->json($documents);
    }

    public function store(Request $request)
    {
        $clinicId = app('currentClinic')->id;

        $data = $request->validate([
            'patient_id' => ['required', 'integer', Rule::exists('patients', 'id')->where('clinic_id', $clinicId)],
            'category' => ['required', 'string', 'max:60'],
            'file' => ['required', 'file', 'max:10240'],
        ]);

        $file = $request->file('file');
        $path = $file->store("clinics/{$clinicId}/patients/{$data['patient_id']}/documents", 'local');

        $document = Document::create([
            'clinic_id' => $clinicId,
            'patient_id' => $data['patient_id'],
            'uploaded_by' => $request->user()?->id,
            'category' => $data['category'],
            'filename' => basename($path),
            'original_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType() ?: 'application/octet-stream',
            'size_bytes' => $file->getSize(),
            'disk' => 'local',
            'path' => $path,
        ]);

        return response()->json($document->load(['patient', 'uploadedBy']), 201);
    }

    public function download(Document $document)
    {
        return Storage::disk($document->disk)->download($document->path, $document->original_name);
    }

    public function destroy(Document $document)
    {
        if (Storage::disk($document->disk)->exists($document->path)) {
            Storage::disk($document->disk)->delete($document->path);
        }

        $document->delete();

        return response()->noContent();
    }
}

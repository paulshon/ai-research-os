# Citation Engines - v22

This directory contains all the citation processing engines for AI Research OS v22.

## Engine Overview

### 1. GROBID Engine (`grobid-engine.ts`)
- **Purpose**: PDF to TEI XML conversion and metadata extraction
- **Features**:
  - FullText API integration
  - TEI XML parsing
  - Health check
- **API**: `http://localhost:8070` (configurable)

### 2. DOI Discovery Engine (`doi-discovery-engine.ts`)
- **Purpose**: Automatic DOI discovery from text and metadata
- **Features**:
  - Crossref DOI lookup
  - OpenAlex DOI lookup
  - Semantic Scholar DOI lookup
  - Text mining for DOI patterns
  - Title similarity matching

### 3. Crossref Resolver (`crossref-resolver.ts`)
- **Purpose**: Full Crossref API integration
- **Features**:
  - DOI lookup
  - Metadata retrieval
  - Citation counts
  - Search functionality
  - Type mapping

### 4. OpenAlex Resolver (`openalex-resolver.ts`)
- **Purpose**: OpenAlex API integration
- **Features**:
  - DOI lookup
  - Metadata retrieval
  - Citation counts
  - Author information
  - Search functionality

### 5. Semantic Scholar Resolver (`semantic-scholar-resolver.ts`)
- **Purpose**: Semantic Scholar API integration
- **Features**:
  - DOI lookup
  - Paper metadata
  - Citation information
  - Author information
  - Recommendations

### 6. Metadata Merge Engine (`metadata-merge-engine.ts`)
- **Purpose**: Merge metadata from multiple sources
- **Features**:
  - Conflict resolution
  - Confidence-based merging
  - Source prioritization
  - Validation

### 7. CSL Engine (`csl-engine.ts`)
- **Purpose**: Citation Style Language formatting
- **Features**:
  - CSL JSON conversion
  - Multi-style formatting (APA, MLA, Chicago, IEEE, etc.)
  - In-text citation formatting
  - Style metadata

### 8. Confidence Engine (`confidence-engine.ts`)
- **Purpose**: Calculate confidence scores
- **Features**:
  - DOI verification scoring
  - Metadata completeness scoring
  - Source reliability scoring
  - Validation and suggestions

### 9. Author Normalization Engine (`author-normalization-engine.ts`)
- **Purpose**: Normalize author names
- **Features**:
  - Korean and Western name handling
  - ORCID validation
  - Deduplication
  - Similarity calculation

### 10. Reference Segmentation Engine (`reference-segmentation-engine.ts`)
- **Purpose**: Parse reference lists
- **Features**:
  - Reference section detection
  - Individual reference segmentation
  - Metadata extraction
  - Validation

### 11. PDF Layout Engine (`pdf-layout-engine.ts`)
- **Purpose**: Advanced PDF text extraction
- **Features**:
  - Multi-column layout detection
  - Table extraction
  - Figure extraction
  - Section header detection
  - Text flow reconstruction

### 12. Citation Validation Engine (`citation-validation-engine.ts`)
- **Purpose**: AI-powered citation validation
- **Features**:
  - DOI validation
  - Metadata consistency checks
  - Duplicate detection
  - Format validation

## Pipeline Integration

All engines are integrated through the main pipeline in `../pipeline.ts`:

```typescript
import { processCitation } from './pipeline';

const result = await processCitation(file, {
  useGROBID: true,
  useCrossref: true,
  useOpenAlex: true,
  useSemanticScholar: true
});
```

## API Endpoints

- **Crossref**: `https://api.crossref.org/works`
- **OpenAlex**: `https://api.openalex.org/works`
- **Semantic Scholar**: `https://api.semanticscholar.org/graph/v1/paper`
- **GROBID**: `http://localhost:8070` (configurable)

## Configuration

Environment variables:
- `GROBID_URL`: GROBID server URL (default: `http://localhost:8070`)

## Testing

Each engine can be tested independently:

```typescript
import { discoverDOI } from './engines';
const result = await discoverDOI({ title: 'Paper Title' });
```

## v22 Improvements

- Complete GROBID integration
- Real API implementations (not stubs)
- Full CSL support
- Confidence scoring
- Author normalization
- Reference segmentation
- PDF layout awareness
- AI validation

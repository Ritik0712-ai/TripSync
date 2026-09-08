"""
Refactor trip/[id]/page.tsx to add:
1. Desktop split view (itinerary left, map right)
2. Mobile tab bar (Itinerary | Map)
"""

import re

with open('/Volumes/RitikSSD/Projects/TripSync/src/app/(dashboard)/trip/[id]/page.tsx') as f:
    content = f.read()

# The itinerary card is a {day && (...)} block inside the split div.
# We need to:
# - Keep the itinerary card inside the split div
# - Add a map column div after it
# - Close the split div properly
# - On mobile: conditionally show itinerary or map (not both)

# Find where the desktop split div ends — the first occurrence of
# the closing }) of the {day && (...)} block that contains the itinerary Card

# Strategy: find the line
# "      )}" that ends the {day && stopDialogOpen && ( block (it's on line 614 in original)
# But we need to find the END of the itinerary card.
# Looking at the output, the itinerary card ends at:
# line 594: </Card>
# line 595: )}
# line 596: (blank)
#
# The split div at line 395 ends when the itinerary column div closes.

# The structure we want:
# <!-- Desktop split -->
# <div className="hidden lg:grid lg:grid-cols-2 gap-6">
#   <!-- Itinerary column -->
#   <div>
#     {day && itinerary card}
#   </div>
#
#   <!-- Map column -->
#   <div className="sticky top-6">
#     {day ? <TripMap /> : <TripMapPlaceholder />}
#   </div>
# </div>
#
# <!-- Mobile: itinerary OR map -->
# <div className="lg:hidden">
#   {mobileTab === 'itinerary' && (itinerary card)}
#   {mobileTab === 'map' && <TripMap />}
# </div>

# Find the old split section. It starts with the Desktop comment
# and ends with the itinerary card's closing )} (line 595)
OLD_DESKTOP_SPLIT = '''      {/* Desktop: two-column split */}
      <div className="hidden lg:grid lg:grid-cols-2 gap-6 items-start">
        <div>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                {editMode && titleDraft !== null ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={titleDraft}
                      onChange={(e) => setTitleDraft(e.target.value)}
                      className="max-w-sm"
                      autoFocus
                    />
                    <Button size="sm" onClick={() => saveDayTitle(day)} disabled={busy}>
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setTitleDraft(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl">
                      {day.day_title || `Day ${day.day_number}`}
                    </CardTitle>
                    {editMode && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setTitleDraft(day.day_title ?? null)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                {dayMapsUrl && (
                  <a
                    href={dayMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="secondary" size="sm" className="gap-2">
                      <MapPin className="w-4 h-4" />
                      Open route
                    </Button>
                  </a>
                )}
                {editMode && (
                  <Button size="sm" className="gap-2" onClick={() => { setEditingStop(null); setStopDialogOpen(true) }} disabled={busy}>
                    <Plus className="w-4 h-4" />
                    Add stop
                  </Button>
                )}
              </div>
            </div>
            <CardDescription>{formatDate(day.date)}</CardDescription>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              {!day.stops?.length ? (
                <p className="text-gray-500 text-center py-8">
                  {editMode ? 'No stops yet — add the first one.' : 'No stops planned for this day'}
                </p>
              ) : (
                day.stops.map((stop, index) => {
                  const config = CATEGORY_CONFIG[stop.category ?? ''] ?? CATEGORY_CONFIG.attraction
                  const CategoryIcon = config.icon

                  return (
                    <div key={stop.id} className="relative">
                      {index < day.stops.length - 1 && (
                        <div className="absolute left-5 top-14 bottom-0 w-0.5 bg-gray-200" />
                      )}

                      <div className="flex gap-3">
                        <div className={`mt-1 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${config.color}`}>
                          <CategoryIcon className="w-5 h-5" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900">{stop.place_name}</h4>
                              {stop.address && (
                                <p className="text-sm text-gray-500">{stop.address}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {editMode && (
                                <>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    disabled={busy || index === 0}
                                    onClick={() => moveStop(day, index, -1)}
                                  >
                                    <ChevronUp className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    disabled={busy || index === (day.stops?.length ?? 0) - 1}
                                    onClick={() => moveStop(day, index, 1)}
                                  >
                                    <ChevronDown className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    onClick={() => { setEditingStop(stop); setStopDialogOpen(true) }}
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </Button>
                                </>
                              )}
                              <a
                                href={mapsUrlForStop(stop)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-gray-600">
                            {stop.start_time && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {String(stop.start_time).slice(0, 5)}
                              </span>
                            )}
                            <span>{stop.duration_minutes} min</span>
                            {stop.estimated_cost != null && stop.estimated_cost > 0 && (
                              <span className="flex items-center gap-1">
                                <span>{symbol}{(stop.estimated_cost).toLocaleString()}</span>
                              </span>
                            )}
                          </div>

                          {stop.notes && (
                            <p className="mt-2 text-sm text-gray-500">{stop.notes}</p>
                          )}

                          {editMode && (
                            <div className="flex gap-2 mt-3">
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 text-red-600 hover:text-red-700"
                                disabled={busy}
                                onClick={() => deleteStop(stop)}
                              >
                                <Trash2 className="w-3 h-3" />
                                Remove
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  </div>'''

NEW_DESKTOP_SPLIT = '''      {/* Desktop: split — itinerary left, map right */}
      <div className="hidden lg:grid lg:grid-cols-2 gap-6 items-start">
        {/* Itinerary column */}
        <div>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                {editMode && titleDraft !== null ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={titleDraft}
                      onChange={(e) => setTitleDraft(e.target.value)}
                      className="max-w-sm"
                      autoFocus
                    />
                    <Button size="sm" onClick={() => saveDayTitle(day)} disabled={busy}>
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setTitleDraft(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl">
                      {day.day_title || `Day ${day.day_number}`}
                    </CardTitle>
                    {editMode && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setTitleDraft(day.day_title ?? null)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                {dayMapsUrl && (
                  <a
                    href={dayMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="secondary" size="sm" className="gap-2">
                      <MapPin className="w-4 h-4" />
                      Open route
                    </Button>
                  </a>
                )}
                {editMode && (
                  <Button size="sm" className="gap-2" onClick={() => { setEditingStop(null); setStopDialogOpen(true) }} disabled={busy}>
                    <Plus className="w-4 h-4" />
                    Add stop
                  </Button>
                )}
              </div>
            </div>
            <CardDescription>{formatDate(day.date)}</CardDescription>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              {!day.stops?.length ? (
                <p className="text-gray-500 text-center py-8">
                  {editMode ? 'No stops yet — add the first one.' : 'No stops planned for this day'}
                </p>
              ) : (
                day.stops.map((stop, index) => {
                  const config = CATEGORY_CONFIG[stop.category ?? ''] ?? CATEGORY_CONFIG.attraction
                  const CategoryIcon = config.icon

                  return (
                    <div key={stop.id} className="relative">
                      {index < day.stops.length - 1 && (
                        <div className="absolute left-5 top-14 bottom-0 w-0.5 bg-gray-200" />
                      )}

                      <div className="flex gap-3">
                        <div className={`mt-1 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${config.color}`}>
                          <CategoryIcon className="w-5 h-5" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900">{stop.place_name}</h4>
                              {stop.address && (
                                <p className="text-sm text-gray-500">{stop.address}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {editMode && (
                                <>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    disabled={busy || index === 0}
                                    onClick={() => moveStop(day, index, -1)}
                                  >
                                    <ChevronUp className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    disabled={busy || index === (day.stops?.length ?? 0) - 1}
                                    onClick={() => moveStop(day, index, 1)}
                                  >
                                    <ChevronDown className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    onClick={() => { setEditingStop(stop); setStopDialogOpen(true) }}
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </Button>
                                </>
                              )}
                              <a
                                href={mapsUrlForStop(stop)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-gray-600">
                            {stop.start_time && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {String(stop.start_time).slice(0, 5)}
                              </span>
                            )}
                            <span>{stop.duration_minutes} min</span>
                            {stop.estimated_cost != null && stop.estimated_cost > 0 && (
                              <span className="flex items-center gap-1">
                                <span>{symbol}{(stop.estimated_cost).toLocaleString()}</span>
                              </span>
                            )}
                          </div>

                          {stop.notes && (
                            <p className="mt-2 text-sm text-gray-500">{stop.notes}</p>
                          )}

                          {editMode && (
                            <div className="flex gap-2 mt-3">
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 text-red-600 hover:text-red-700"
                                disabled={busy}
                                onClick={() => deleteStop(stop)}
                              >
                                <Trash2 className="w-3 h-3" />
                                Remove
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>

      {/* Map column — sticky so it stays visible while scrolling itinerary */}
      <div className="hidden lg:block sticky top-6">
        {day ? (
          <div className="h-[calc(100vh-8rem)] rounded-xl overflow-hidden border">
            <TripMap
              stops={day.stops ?? []}
              dayIndex={selectedDay}
            />
          </div>
        ) : (
          <div className="h-[calc(100vh-8rem)] rounded-xl border flex items-center justify-center bg-slate-50">
            <p className="text-sm text-gray-400">Select a day to see the map</p>
          </div>
        )}
      </div>
    </div>

    {/* Mobile: show itinerary OR map, not both */}
    <div className="lg:hidden">
      {mobileTab === 'itinerary' && day && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                {editMode && titleDraft !== null ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={titleDraft}
                      onChange={(e) => setTitleDraft(e.target.value)}
                      className="max-w-sm"
                      autoFocus
                    />
                    <Button size="sm" onClick={() => saveDayTitle(day)} disabled={busy}>
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setTitleDraft(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl">
                      {day.day_title || `Day ${day.day_number}`}
                    </CardTitle>
                    {editMode && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setTitleDraft(day.day_title ?? null)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                {dayMapsUrl && (
                  <a href={dayMapsUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="secondary" size="sm" className="gap-2">
                      <MapPin className="w-4 h-4" />
                      Open route
                    </Button>
                  </a>
                )}
                {editMode && (
                  <Button size="sm" className="gap-2" onClick={() => { setEditingStop(null); setStopDialogOpen(true) }} disabled={busy}>
                    <Plus className="w-4 h-4" />
                    Add stop
                  </Button>
                )}
              </div>
            </div>
            <CardDescription>{formatDate(day.date)}</CardDescription>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              {!day.stops?.length ? (
                <p className="text-gray-500 text-center py-8">
                  {editMode ? 'No stops yet — add the first one.' : 'No stops planned for this day'}
                </p>
              ) : (
                day.stops.map((stop, index) => {
                  const config = CATEGORY_CONFIG[stop.category ?? ''] ?? CATEGORY_CONFIG.attraction
                  const CategoryIcon = config.icon

                  return (
                    <div key={stop.id} className="relative">
                      {index < day.stops.length - 1 && (
                        <div className="absolute left-5 top-14 bottom-0 w-0.5 bg-gray-200" />
                      )}

                      <div className="flex gap-3">
                        <div className={`mt-1 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${config.color}`}>
                          <CategoryIcon className="w-5 h-5" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900">{stop.place_name}</h4>
                              {stop.address && (
                                <p className="text-sm text-gray-500">{stop.address}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {editMode && (
                                <>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    disabled={busy || index === 0}
                                    onClick={() => moveStop(day, index, -1)}
                                  >
                                    <ChevronUp className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    disabled={busy || index === (day.stops?.length ?? 0) - 1}
                                    onClick={() => moveStop(navivew, index, 1)}
                                  >
                                    <ChevronDown className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    onClick={() => { setEditingStop(stop); setStopDialogOpen(true) }}
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </Button>
                                </>
                              )}
                              <a
                                href={mapsUrlForStop(stop)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-gray-600">
                            {stop.start_time && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {String(stop.start_time).slice(0, 5)}
                              </span>
                            )}
                            <span>{stop.duration_minutes} min</span>
                            {stop.estimated_cost != null && stop.estimated_cost > 0 && (
                              <span className="flex items-center gap-1">
                                <span>{symbol}{(stop.estimated_cost).toLocaleString()}</span>
                              </span>
                            )}
                          </div>

                          {stop.notes && (
                            <p className="mt-2 text-sm text-gray-500">{stop.notes}</p>
                          )}

                          {editMode && (
                            <div className="flex gap-2 mt-3">
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 text-red-600 hover:text-red-700"
                                disabled={busy}
                                onClick={() => deleteStop(stop)}
                              >
                                <Trash2 className="w-3 h-3" />
                                Remove
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {mobileTab === 'map' && (
        <div className="h-[calc(100vh-12rem)] rounded-xl overflow-hidden border">
          {day ? (
            <TripMap stops={day.stops ?? []} dayIndex={selectedDay} />
          ) : (
            <TripMapPlaceholder totalStops={0} geocodedStops={0} />
          )}
        </div>
      )}
    </div>'''

if OLD_DESKTOP_SPLIT not in content:
    print("ERROR: could not find old block to replace")
    print("Searching for approximate match...")
    idx = content.find('      {/* Desktop: two-column split */}')
    if idx >= 0:
        print(f"Found at index {idx}, showing 100 chars:")
        print(repr(content[idx:idx+200]))
    else:
        print("Could not find desktop comment at all")
    exit(1)

new_content = content.replace(OLD_DESKTOP_SPLIT, NEW_DESKTOP_SPLIT, 1)

with open('/Volumes/RitikSSD/Projects/TripSync/src/app/(dashboard)/trip/[id]/page.tsx', 'w') as f:
    f.write(new_content)

print("Done.")

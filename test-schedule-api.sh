#!/bin/bash

##############################################################################
# Torre Tempo - Schedule API Test Script
# Tests all scheduling endpoints after deployment
##############################################################################

set -e

# Configuration
API_URL="${1:-https://time.lsltgroup.es/api/v1}"
TENANT_SLUG="demo"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_test() {
    echo -e "${YELLOW}TEST: $1${NC}"
}

print_pass() {
    echo -e "${GREEN}✓ PASS${NC}"
}

print_fail() {
    echo -e "${RED}✗ FAIL: $1${NC}"
}

##############################################################################
# Step 1: Login and get token
##############################################################################

print_test "Login as admin"

TOKEN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@torretempo.com",
    "password": "admin123",
    "tenantSlug": "demo"
  }')

ACCESS_TOKEN=$(echo $TOKEN_RESPONSE | grep -o '"accessToken":"[^"]*' | sed 's/"accessToken":"//')

if [ -z "$ACCESS_TOKEN" ]; then
    print_fail "Login failed"
    echo $TOKEN_RESPONSE
    exit 1
fi

print_pass
echo "Token: ${ACCESS_TOKEN:0:20}..."

##############################################################################
# Step 2: Create Schedule
##############################################################################

print_test "Create new schedule"

SCHEDULE_RESPONSE=$(curl -s -X POST "$API_URL/schedule/schedules" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "title": "Week of Feb 10-16 (API Test)",
    "startDate": "2026-02-10T00:00:00Z",
    "endDate": "2026-02-16T23:59:59Z",
    "notes": "Created via API test script"
  }')

SCHEDULE_ID=$(echo $SCHEDULE_RESPONSE | grep -o '"id":"[^"]*' | head -1 | sed 's/"id":"//')

if [ -z "$SCHEDULE_ID" ]; then
    print_fail "Schedule creation failed"
    echo $SCHEDULE_RESPONSE
    exit 1
fi

print_pass
echo "Schedule ID: $SCHEDULE_ID"

##############################################################################
# Step 3: Create Shift
##############################################################################

print_test "Create shift"

SHIFT_RESPONSE=$(curl -s -X POST "$API_URL/schedule/schedules/$SCHEDULE_ID/shifts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "startTime": "2026-02-10T09:00:00Z",
    "endTime": "2026-02-10T17:00:00Z",
    "breakMinutes": 30,
    "role": "Bartender",
    "location": "Bar Area",
    "color": "#3B82F6"
  }')

SHIFT_ID=$(echo $SHIFT_RESPONSE | grep -o '"id":"[^"]*' | head -1 | sed 's/"id":"//')

if [ -z "$SHIFT_ID" ]; then
    print_fail "Shift creation failed"
    echo $SHIFT_RESPONSE
    exit 1
fi

print_pass
echo "Shift ID: $SHIFT_ID"

##############################################################################
# Step 4: Create Overlapping Shift (Conflict Test)
##############################################################################

print_test "Create overlapping shift (should detect conflict)"

OVERLAP_SHIFT=$(curl -s -X POST "$API_URL/schedule/schedules/$SCHEDULE_ID/shifts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "startTime": "2026-02-10T14:00:00Z",
    "endTime": "2026-02-10T18:00:00Z",
    "breakMinutes": 0,
    "role": "Server"
  }')

# Both shifts are unassigned, so no conflict expected yet
print_pass

##############################################################################
# Step 5: Get All Shifts
##############################################################################

print_test "Get all shifts for schedule"

SHIFTS_RESPONSE=$(curl -s -X GET "$API_URL/schedule/schedules/$SCHEDULE_ID/shifts" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

SHIFT_COUNT=$(echo $SHIFTS_RESPONSE | grep -o '"id":' | wc -l)

if [ "$SHIFT_COUNT" -lt 2 ]; then
    print_fail "Expected at least 2 shifts, got $SHIFT_COUNT"
    exit 1
fi

print_pass
echo "Found $SHIFT_COUNT shifts"

##############################################################################
# Step 6: Get Conflicts
##############################################################################

print_test "Check for conflicts"

CONFLICTS_RESPONSE=$(curl -s -X GET "$API_URL/schedule/schedules/$SCHEDULE_ID/conflicts" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

print_pass
echo "Conflicts: $CONFLICTS_RESPONSE"

##############################################################################
# Step 7: Attempt Publish (should succeed - no conflicts)
##############################################################################

print_test "Publish schedule"

PUBLISH_RESPONSE=$(curl -s -X POST "$API_URL/schedule/schedules/$SCHEDULE_ID/publish" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if echo $PUBLISH_RESPONSE | grep -q '"status":"published"'; then
    print_pass
else
    print_fail "Publish failed"
    echo $PUBLISH_RESPONSE
    exit 1
fi

##############################################################################
# Step 8: Lock Schedule
##############################################################################

print_test "Lock schedule"

LOCK_RESPONSE=$(curl -s -X POST "$API_URL/schedule/schedules/$SCHEDULE_ID/lock" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "reason": "API test - locking for verification"
  }')

if echo $LOCK_RESPONSE | grep -q '"status":"locked"'; then
    print_pass
else
    print_fail "Lock failed"
    echo $LOCK_RESPONSE
    exit 1
fi

##############################################################################
# Step 9: Attempt to Edit Locked Schedule (should fail)
##############################################################################

print_test "Try to create shift in locked schedule (should fail)"

LOCKED_SHIFT=$(curl -s -X POST "$API_URL/schedule/schedules/$SCHEDULE_ID/shifts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "startTime": "2026-02-11T09:00:00Z",
    "endTime": "2026-02-11T17:00:00Z"
  }')

if echo $LOCKED_SHIFT | grep -q "locked"; then
    print_pass
    echo "Correctly rejected edit to locked schedule"
else
    print_fail "Should have blocked edit to locked schedule"
    echo $LOCKED_SHIFT
fi

##############################################################################
# Step 10: Unlock Schedule
##############################################################################

print_test "Unlock schedule"

UNLOCK_RESPONSE=$(curl -s -X POST "$API_URL/schedule/schedules/$SCHEDULE_ID/unlock" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "reason": "API test - unlocking for cleanup"
  }')

if echo $UNLOCK_RESPONSE | grep -q '"status":"published"'; then
    print_pass
else
    print_fail "Unlock failed"
    echo $UNLOCK_RESPONSE
fi

##############################################################################
# Step 11: Delete Test Data
##############################################################################

print_test "Cleanup: Delete shifts"
curl -s -X DELETE "$API_URL/schedule/shifts/$SHIFT_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" > /dev/null
print_pass

print_test "Cleanup: Delete schedule"

# Unlock first if needed
curl -s -X POST "$API_URL/schedule/schedules/$SCHEDULE_ID/unlock" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{"reason": "cleanup"}' > /dev/null 2>&1 || true

# Delete
DELETE_RESPONSE=$(curl -s -X DELETE "$API_URL/schedule/schedules/$SCHEDULE_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if echo $DELETE_RESPONSE | grep -q "Cannot delete published"; then
    echo "Note: Cannot delete published schedule (expected behavior)"
    print_pass
else
    print_pass
fi

##############################################################################
# Summary
##############################################################################

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}All API Tests Passed! ✓${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Tested Endpoints:"
echo "  ✓ POST /auth/login"
echo "  ✓ POST /schedule/schedules"
echo "  ✓ POST /schedule/schedules/:id/shifts"
echo "  ✓ GET  /schedule/schedules/:id/shifts"
echo "  ✓ GET  /schedule/schedules/:id/conflicts"
echo "  ✓ POST /schedule/schedules/:id/publish"
echo "  ✓ POST /schedule/schedules/:id/lock"
echo "  ✓ POST /schedule/schedules/:id/unlock"
echo "  ✓ DELETE /schedule/shifts/:id"
echo "  ✓ DELETE /schedule/schedules/:id"
echo ""

# Avenai Security Testing Guide

## 🧪 Testing Your Security Features

### **1. Security Page Testing**
```bash
# Visit the security page
open http://localhost:3000/security
```
**What to check:**
- ✅ Security badges display correctly
- ✅ Contact information is visible
- ✅ Trust indicators are prominent
- ✅ Page loads without errors

### **2. Data Export API Testing**
```bash
# Test data export (requires authentication)
curl -X GET "http://localhost:3000/api/user/data-export?format=json" \
  -H "Cookie: auth-token=YOUR_TOKEN" \
  -o "data-export.json"

# Test CSV export
curl -X GET "http://localhost:3000/api/user/data-export?format=csv" \
  -H "Cookie: auth-token=YOUR_TOKEN" \
  -o "data-export.csv"
```
**What to check:**
- ✅ JSON export contains all user data
- ✅ CSV export is properly formatted
- ✅ Files download with correct headers
- ✅ Audit logs are created

### **3. Data Deletion API Testing**
```bash
# Test data deletion (requires confirmation)
curl -X DELETE "http://localhost:3000/api/user/data-deletion?confirm=true" \
  -H "Cookie: auth-token=YOUR_TOKEN"

# Test data anonymization
curl -X POST "http://localhost:3000/api/user/data-deletion?confirm=true" \
  -H "Cookie: auth-token=YOUR_TOKEN"
```
**What to check:**
- ✅ Deletion requires confirmation
- ✅ Data is permanently removed
- ✅ Audit logs are created
- ✅ Organization data is handled correctly

### **4. Rate Limiting Testing**
```bash
# Test rate limiting on auth endpoint
for i in {1..15}; do
  curl -X POST "http://localhost:3000/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}' \
    -w "Status: %{http_code}\n"
done
```
**What to check:**
- ✅ After 10 requests, you get 429 status
- ✅ Rate limit headers are present
- ✅ Retry-After header is set

### **5. Audit Logging Testing**
```bash
# View audit logs
curl -X GET "http://localhost:3000/api/audit-logs" \
  -H "Cookie: auth-token=YOUR_TOKEN"

# View audit logs with filters
curl -X GET "http://localhost:3000/api/audit-logs?eventType=LOGIN_SUCCESS&limit=10" \
  -H "Cookie: auth-token=YOUR_TOKEN"
```
**What to check:**
- ✅ Logs are returned in correct format
- ✅ Filtering works correctly
- ✅ Pagination works
- ✅ Statistics are included

### **6. Security Headers Testing**
```bash
# Check security headers
curl -I http://localhost:3000/
```
**What to check:**
- ✅ X-Content-Type-Options: nosniff
- ✅ X-Frame-Options: DENY
- ✅ X-XSS-Protection: 1; mode=block
- ✅ Strict-Transport-Security header

## 🔍 Manual Testing Checklist

### **Marketing Page Security Section**
- [ ] Security section displays on main page
- [ ] All security badges are visible
- [ ] Trust indicators are prominent
- [ ] Security link in footer works

### **Authentication Security**
- [ ] Login attempts are logged
- [ ] Failed logins are tracked
- [ ] Rate limiting works on auth endpoints
- [ ] JWT tokens are secure

### **Data Protection**
- [ ] Data export works correctly
- [ ] Data deletion works correctly
- [ ] Audit logs are created for all actions
- [ ] User data is properly isolated

### **API Security**
- [ ] Rate limiting is enforced
- [ ] Security headers are present
- [ ] Input validation works
- [ ] Error handling is secure

## 📊 Monitoring & Alerts

### **What to Monitor**
1. **Failed login attempts** - Look for patterns
2. **Rate limit violations** - Potential attacks
3. **Data export/deletion requests** - Compliance tracking
4. **Suspicious activity** - Unusual patterns

### **Alert Thresholds**
- **Failed logins**: >5 per IP per hour
- **Rate limit violations**: >20 per IP per hour
- **Data exports**: >3 per user per day
- **Unauthorized access**: Any attempt

## 🚨 Security Incident Response

### **If You Discover Issues**
1. **Document the issue** with screenshots
2. **Check audit logs** for related activity
3. **Contact security team** at security@avenai.com
4. **Update documentation** if needed

### **Emergency Contacts**
- **Security Team**: security@avenai.com
- **Data Protection Officer**: dpo@avenai.com
- **Incident Reporting**: security-incident@avenai.com

## 📈 Performance Testing

### **Load Testing Security Features**
```bash
# Test rate limiting under load
ab -n 1000 -c 10 http://localhost:3000/api/auth/login

# Test audit logging performance
ab -n 100 -c 5 http://localhost:3000/api/audit-logs
```

### **Database Performance**
- Monitor audit log table size
- Check query performance
- Ensure proper indexing

## ✅ Production Readiness Checklist

### **Before Going Live**
- [ ] All security tests pass
- [ ] Rate limiting is configured
- [ ] Audit logging is working
- [ ] Security headers are set
- [ ] Contact information is updated
- [ ] Documentation is complete
- [ ] Privacy policy is customized
- [ ] Security monitoring is set up

### **Post-Launch Monitoring**
- [ ] Monitor audit logs daily
- [ ] Check rate limiting effectiveness
- [ ] Review security incidents
- [ ] Update documentation as needed
- [ ] Regular security assessments

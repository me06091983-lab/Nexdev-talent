-- NexDev Talent — Seed nomenclatoare

-- =====================
-- PROFILURI (categorii candidați)
-- =====================
insert into profiles (name) values
  ('Project Manager'),
  ('Delivery Manager'),
  ('Scrum Master'),
  ('Business Analyst'),
  ('Product Owner'),
  ('Penetration Tester'),
  ('Security Engineer'),
  ('Data Engineer'),
  ('Data Analyst'),
  ('Data Scientist'),
  ('DWH Developer'),
  ('BI Developer'),
  ('DevOps Engineer'),
  ('Platform Engineer'),
  ('Cloud Engineer'),
  ('SRE'),
  ('iOS Developer'),
  ('Android Developer'),
  ('Mobile Developer'),
  ('Frontend Developer'),
  ('Backend Developer'),
  ('Full Stack Developer'),
  ('Java Developer'),
  ('Python Developer'),
  ('C# / .NET Developer'),
  ('Node.js Developer'),
  ('React Developer'),
  ('Angular Developer'),
  ('Quantitative Developer'),
  ('Algorithmic Trader'),
  ('Software Architect'),
  ('Solution Architect'),
  ('Enterprise Architect'),
  ('QA Engineer'),
  ('Test Automation Engineer'),
  ('SDET'),
  ('Salesforce Developer'),
  ('ServiceNow Developer'),
  ('Power Platform Developer'),
  ('Vendor Manager'),
  ('IT Recruiter'),
  ('Technical Recruiter')
on conflict (name) do nothing;

-- =====================
-- CLIENT: LSEG
-- =====================
insert into clients (name, fieldglass_enabled) values
  ('London Stock Exchange Group (LSEG)', true)
on conflict (name) do nothing;

-- =====================
-- SKILLURI IT (~300)
-- =====================

-- Limbaje de programare
insert into skills (name, category) values
  ('Python', 'Programming Languages'),
  ('Java', 'Programming Languages'),
  ('JavaScript', 'Programming Languages'),
  ('TypeScript', 'Programming Languages'),
  ('C#', 'Programming Languages'),
  ('C++', 'Programming Languages'),
  ('Go', 'Programming Languages'),
  ('Rust', 'Programming Languages'),
  ('Kotlin', 'Programming Languages'),
  ('Swift', 'Programming Languages'),
  ('Scala', 'Programming Languages'),
  ('R', 'Programming Languages'),
  ('PHP', 'Programming Languages'),
  ('Ruby', 'Programming Languages'),
  ('Perl', 'Programming Languages'),
  ('MATLAB', 'Programming Languages'),
  ('Bash / Shell Scripting', 'Programming Languages'),
  ('PowerShell', 'Programming Languages'),
  ('Groovy', 'Programming Languages'),
  ('Lua', 'Programming Languages')
on conflict (name) do nothing;

-- Frontend
insert into skills (name, category) values
  ('React', 'Frontend'),
  ('Next.js', 'Frontend'),
  ('Angular', 'Frontend'),
  ('Vue.js', 'Frontend'),
  ('Svelte', 'Frontend'),
  ('HTML5', 'Frontend'),
  ('CSS3', 'Frontend'),
  ('Tailwind CSS', 'Frontend'),
  ('SASS / SCSS', 'Frontend'),
  ('Redux', 'Frontend'),
  ('GraphQL (client)', 'Frontend'),
  ('Webpack', 'Frontend'),
  ('Vite', 'Frontend'),
  ('Storybook', 'Frontend'),
  ('React Native', 'Frontend'),
  ('Expo', 'Frontend')
on conflict (name) do nothing;

-- Backend & Frameworks
insert into skills (name, category) values
  ('Node.js', 'Backend'),
  ('Express.js', 'Backend'),
  ('NestJS', 'Backend'),
  ('Spring Boot', 'Backend'),
  ('Django', 'Backend'),
  ('FastAPI', 'Backend'),
  ('Flask', 'Backend'),
  ('.NET / ASP.NET Core', 'Backend'),
  ('Laravel', 'Backend'),
  ('Ruby on Rails', 'Backend'),
  ('GraphQL (server)', 'Backend'),
  ('REST API Design', 'Backend'),
  ('gRPC', 'Backend'),
  ('Microservices', 'Backend'),
  ('Event-Driven Architecture', 'Backend'),
  ('CQRS', 'Backend'),
  ('Domain-Driven Design', 'Backend')
on conflict (name) do nothing;

-- Mobile
insert into skills (name, category) values
  ('iOS Development', 'Mobile'),
  ('Android Development', 'Mobile'),
  ('SwiftUI', 'Mobile'),
  ('UIKit', 'Mobile'),
  ('Jetpack Compose', 'Mobile'),
  ('Flutter', 'Mobile'),
  ('Xamarin', 'Mobile'),
  ('Cordova / PhoneGap', 'Mobile'),
  ('Push Notifications', 'Mobile'),
  ('App Store Connect', 'Mobile'),
  ('Google Play Console', 'Mobile')
on conflict (name) do nothing;

-- Baze de date
insert into skills (name, category) values
  ('PostgreSQL', 'Databases'),
  ('MySQL', 'Databases'),
  ('Microsoft SQL Server', 'Databases'),
  ('Oracle Database', 'Databases'),
  ('MongoDB', 'Databases'),
  ('Redis', 'Databases'),
  ('Elasticsearch', 'Databases'),
  ('Cassandra', 'Databases'),
  ('DynamoDB', 'Databases'),
  ('SQLite', 'Databases'),
  ('Snowflake', 'Databases'),
  ('BigQuery', 'Databases'),
  ('Redshift', 'Databases'),
  ('Databricks', 'Databases'),
  ('ClickHouse', 'Databases'),
  ('Neo4j', 'Databases'),
  ('Cosmos DB', 'Databases'),
  ('Supabase', 'Databases')
on conflict (name) do nothing;

-- Cloud
insert into skills (name, category) values
  ('AWS', 'Cloud'),
  ('Microsoft Azure', 'Cloud'),
  ('Google Cloud Platform (GCP)', 'Cloud'),
  ('AWS Lambda', 'Cloud'),
  ('AWS EC2', 'Cloud'),
  ('AWS S3', 'Cloud'),
  ('AWS RDS', 'Cloud'),
  ('AWS EKS', 'Cloud'),
  ('AWS CloudFormation', 'Cloud'),
  ('Azure DevOps', 'Cloud'),
  ('Azure Kubernetes Service (AKS)', 'Cloud'),
  ('Azure Functions', 'Cloud'),
  ('Azure Data Factory', 'Cloud'),
  ('GCP BigQuery', 'Cloud'),
  ('GCP Cloud Run', 'Cloud'),
  ('GCP Pub/Sub', 'Cloud'),
  ('Cloudflare', 'Cloud'),
  ('Vercel', 'Cloud'),
  ('Heroku', 'Cloud'),
  ('DigitalOcean', 'Cloud')
on conflict (name) do nothing;

-- DevOps & Infrastructure
insert into skills (name, category) values
  ('Docker', 'DevOps'),
  ('Kubernetes', 'DevOps'),
  ('Helm', 'DevOps'),
  ('Terraform', 'DevOps'),
  ('Ansible', 'DevOps'),
  ('Puppet', 'DevOps'),
  ('Chef', 'DevOps'),
  ('Jenkins', 'DevOps'),
  ('GitHub Actions', 'DevOps'),
  ('GitLab CI/CD', 'DevOps'),
  ('CircleCI', 'DevOps'),
  ('ArgoCD', 'DevOps'),
  ('FluxCD', 'DevOps'),
  ('Prometheus', 'DevOps'),
  ('Grafana', 'DevOps'),
  ('ELK Stack', 'DevOps'),
  ('Datadog', 'DevOps'),
  ('New Relic', 'DevOps'),
  ('Nginx', 'DevOps'),
  ('HAProxy', 'DevOps'),
  ('Linux Administration', 'DevOps'),
  ('Git', 'DevOps'),
  ('SonarQube', 'DevOps'),
  ('HashiCorp Vault', 'DevOps'),
  ('Istio / Service Mesh', 'DevOps')
on conflict (name) do nothing;

-- Data & Analytics
insert into skills (name, category) values
  ('Apache Spark', 'Data & Analytics'),
  ('Apache Kafka', 'Data & Analytics'),
  ('Apache Airflow', 'Data & Analytics'),
  ('dbt (data build tool)', 'Data & Analytics'),
  ('Apache Flink', 'Data & Analytics'),
  ('Hadoop', 'Data & Analytics'),
  ('Hive', 'Data & Analytics'),
  ('Tableau', 'Data & Analytics'),
  ('Power BI', 'Data & Analytics'),
  ('Looker', 'Data & Analytics'),
  ('Qlik Sense', 'Data & Analytics'),
  ('SSRS', 'Data & Analytics'),
  ('SSIS', 'Data & Analytics'),
  ('SSAS', 'Data & Analytics'),
  ('ETL Design', 'Data & Analytics'),
  ('Data Warehousing', 'Data & Analytics'),
  ('Data Modeling', 'Data & Analytics'),
  ('Dimensional Modeling', 'Data & Analytics'),
  ('Data Lake Architecture', 'Data & Analytics'),
  ('Data Governance', 'Data & Analytics')
on conflict (name) do nothing;

-- AI & Machine Learning
insert into skills (name, category) values
  ('Machine Learning', 'AI & ML'),
  ('Deep Learning', 'AI & ML'),
  ('TensorFlow', 'AI & ML'),
  ('PyTorch', 'AI & ML'),
  ('Scikit-learn', 'AI & ML'),
  ('Hugging Face', 'AI & ML'),
  ('LangChain', 'AI & ML'),
  ('OpenAI API', 'AI & ML'),
  ('Claude API', 'AI & ML'),
  ('Natural Language Processing', 'AI & ML'),
  ('Computer Vision', 'AI & ML'),
  ('MLOps', 'AI & ML'),
  ('Jupyter Notebooks', 'AI & ML'),
  ('Pandas', 'AI & ML'),
  ('NumPy', 'AI & ML'),
  ('Feature Engineering', 'AI & ML'),
  ('A/B Testing', 'AI & ML'),
  ('Statistical Analysis', 'AI & ML')
on conflict (name) do nothing;

-- Security
insert into skills (name, category) values
  ('Penetration Testing', 'Security'),
  ('Web Application Security', 'Security'),
  ('Network Security', 'Security'),
  ('OWASP Top 10', 'Security'),
  ('Burp Suite', 'Security'),
  ('Metasploit', 'Security'),
  ('Nmap', 'Security'),
  ('Wireshark', 'Security'),
  ('SIEM', 'Security'),
  ('SOC Operations', 'Security'),
  ('Threat Modeling', 'Security'),
  ('Vulnerability Assessment', 'Security'),
  ('Red Teaming', 'Security'),
  ('Blue Teaming', 'Security'),
  ('Incident Response', 'Security'),
  ('Identity & Access Management', 'Security'),
  ('Zero Trust Architecture', 'Security'),
  ('PKI / Cryptography', 'Security'),
  ('CyberArk', 'Security'),
  ('Privileged Access Management', 'Security'),
  ('GDPR Compliance', 'Security'),
  ('ISO 27001', 'Security'),
  ('SOC 2', 'Security'),
  ('PCI DSS', 'Security')
on conflict (name) do nothing;

-- Project & Product Management
insert into skills (name, category) values
  ('Agile / Scrum', 'Project Management'),
  ('Kanban', 'Project Management'),
  ('SAFe', 'Project Management'),
  ('PRINCE2', 'Project Management'),
  ('PMP', 'Project Management'),
  ('JIRA', 'Project Management'),
  ('Confluence', 'Project Management'),
  ('Microsoft Project', 'Project Management'),
  ('Stakeholder Management', 'Project Management'),
  ('Risk Management', 'Project Management'),
  ('Budget Management', 'Project Management'),
  ('Program Management', 'Project Management'),
  ('Change Management', 'Project Management'),
  ('Product Roadmap', 'Project Management'),
  ('OKRs', 'Project Management'),
  ('User Story Mapping', 'Project Management'),
  ('BRD / FRD Writing', 'Project Management'),
  ('UAT Coordination', 'Project Management')
on conflict (name) do nothing;

-- QA & Testing
insert into skills (name, category) values
  ('Manual Testing', 'QA & Testing'),
  ('Test Automation', 'QA & Testing'),
  ('Selenium', 'QA & Testing'),
  ('Playwright', 'QA & Testing'),
  ('Cypress', 'QA & Testing'),
  ('Appium', 'QA & Testing'),
  ('JUnit', 'QA & Testing'),
  ('TestNG', 'QA & Testing'),
  ('Postman', 'QA & Testing'),
  ('REST Assured', 'QA & Testing'),
  ('k6 / JMeter', 'QA & Testing'),
  ('Performance Testing', 'QA & Testing'),
  ('API Testing', 'QA & Testing'),
  ('BDD / Cucumber', 'QA & Testing'),
  ('Test Plan Writing', 'QA & Testing')
on conflict (name) do nothing;

-- Finance & Trading (specific pentru LSEG)
insert into skills (name, category) values
  ('Financial Products Knowledge', 'Finance & Trading'),
  ('Derivatives', 'Finance & Trading'),
  ('Fixed Income', 'Finance & Trading'),
  ('Equities', 'Finance & Trading'),
  ('FX / Forex', 'Finance & Trading'),
  ('Risk Management (Financial)', 'Finance & Trading'),
  ('Quantitative Analysis', 'Finance & Trading'),
  ('Algorithmic Trading', 'Finance & Trading'),
  ('Market Data Feeds', 'Finance & Trading'),
  ('FIX Protocol', 'Finance & Trading'),
  ('Bloomberg Terminal', 'Finance & Trading'),
  ('Murex', 'Finance & Trading'),
  ('Calypso', 'Finance & Trading'),
  ('SWIFT', 'Finance & Trading'),
  ('Basel III / IV', 'Finance & Trading'),
  ('MiFID II', 'Finance & Trading'),
  ('EMIR', 'Finance & Trading')
on conflict (name) do nothing;

-- Enterprise & Platforms
insert into skills (name, category) values
  ('Salesforce', 'Enterprise Platforms'),
  ('ServiceNow', 'Enterprise Platforms'),
  ('SAP', 'Enterprise Platforms'),
  ('Microsoft Dynamics 365', 'Enterprise Platforms'),
  ('Power Platform', 'Enterprise Platforms'),
  ('Power Apps', 'Enterprise Platforms'),
  ('Power Automate', 'Enterprise Platforms'),
  ('SharePoint', 'Enterprise Platforms'),
  ('MuleSoft', 'Enterprise Platforms'),
  ('TIBCO', 'Enterprise Platforms'),
  ('MicroStrategy', 'Enterprise Platforms'),
  ('Workday', 'Enterprise Platforms')
on conflict (name) do nothing;

-- Certificări
insert into skills (name, category) values
  ('AWS Solutions Architect', 'Certifications'),
  ('AWS DevOps Engineer', 'Certifications'),
  ('Azure Administrator (AZ-104)', 'Certifications'),
  ('Azure Solutions Architect (AZ-305)', 'Certifications'),
  ('GCP Professional Cloud Architect', 'Certifications'),
  ('CKA (Certified Kubernetes Administrator)', 'Certifications'),
  ('CKAD', 'Certifications'),
  ('Terraform Associate', 'Certifications'),
  ('CISSP', 'Certifications'),
  ('CEH (Certified Ethical Hacker)', 'Certifications'),
  ('OSCP', 'Certifications'),
  ('CISM', 'Certifications'),
  ('PMP', 'Certifications'),
  ('PRINCE2 Foundation/Practitioner', 'Certifications'),
  ('PSM I/II (Professional Scrum Master)', 'Certifications'),
  ('SAFe Agilist', 'Certifications'),
  ('ITIL v4', 'Certifications'),
  ('CompTIA Security+', 'Certifications'),
  ('Salesforce Administrator', 'Certifications'),
  ('ServiceNow Certified', 'Certifications')
on conflict (name) do nothing;
